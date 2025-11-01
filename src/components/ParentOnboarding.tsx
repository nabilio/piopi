import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  isMissingColumnError,
  shouldAttemptLegacySubscriptionLookup,
  recordLegacySubscriptionLookupFailure,
  recordLegacySubscriptionLookupSuccess,
} from '../utils/subscriptionLegacy';
import { Users, CheckCircle, ArrowRight, AlertCircle, LogOut, Baby, UserPlus, Plus, Edit } from 'lucide-react';
import { Logo } from './Logo';
import type { PlanId } from '../utils/payment';

type ParentOnboardingProps = {
  onComplete: () => void;
};

type SubscriptionRecord = {
  plan_type: string | null;
  children_count: number | null;
  price: number | null;
  status: string | null;
};

type SubscriptionInfo = {
  childrenCount: number;
  monthlyPrice: number;
  planType: PlanId;
};

type PlanOption = {
  id: PlanId;
  name: string;
  childrenCount: number;
  monthlyPrice: number;
  pricePerChild: number;
  description: string;
  isUnlimited?: boolean;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'basic',
    name: 'Solo',
    childrenCount: 1,
    monthlyPrice: 2,
    pricePerChild: 2,
    description: 'Pour 1 enfant'
  },
  {
    id: 'duo',
    name: 'Duo',
    childrenCount: 2,
    monthlyPrice: 3,
    pricePerChild: 1.5,
    description: 'Pour 2 enfants'
  },
  {
    id: 'family',
    name: 'Famille',
    childrenCount: 3,
    monthlyPrice: 5,
    pricePerChild: 1.67,
    description: 'Pour 3 enfants'
  },
  {
    id: 'premium',
    name: 'Premium',
    childrenCount: 4,
    monthlyPrice: 6,
    pricePerChild: 1.5,
    description: 'Pour 4 enfants'
  },
  {
    id: 'liberte',
    name: 'Liberté',
    childrenCount: 5,
    monthlyPrice: 8,
    pricePerChild: 1.6,
    description: '5 enfants inclus puis +2€/enfant supplémentaire',
    isUnlimited: true
  }
];

const PLAN_OPTION_MAP: Record<PlanId, PlanOption> = PLAN_OPTIONS.reduce((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {} as Record<PlanId, PlanOption>);

const PLAN_ID_LIST: PlanId[] = ['basic', 'duo', 'family', 'premium', 'liberte'];

const LAST_COMPLETED_REGISTRATION_KEY = 'lastCompletedRegistrationPlan';

type CachedRegistrationPlan = {
  planId: PlanId;
  children: number;
  billingPeriod: 'monthly' | 'yearly';
};

function readCachedRegistrationPlan(): CachedRegistrationPlan | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(LAST_COMPLETED_REGISTRATION_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CachedRegistrationPlan;
  } catch (error) {
    console.error('Failed to read cached registration plan:', error);
    localStorage.removeItem(LAST_COMPLETED_REGISTRATION_KEY);
    return null;
  }
}

function clearCachedRegistrationPlan() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(LAST_COMPLETED_REGISTRATION_KEY);
}

const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  solo: 'basic',
  trio: 'family',
  famille: 'premium',
};

function isPlanId(value: string): value is PlanId {
  return PLAN_ID_LIST.includes(value as PlanId);
}

function normalizePlanType(planType: string | null | undefined): PlanId {
  if (!planType) {
    return 'basic';
  }

  const lowered = planType.toLowerCase();
  const mapped = LEGACY_PLAN_MAP[lowered] ?? lowered;

  return isPlanId(mapped) ? mapped : 'basic';
}

function inferPlanFromCount(childrenCount: number): PlanId {
  if (childrenCount <= 1) return 'basic';
  if (childrenCount === 2) return 'duo';
  if (childrenCount === 3) return 'family';
  if (childrenCount === 4) return 'premium';
  return 'liberte';
}

export function ParentOnboarding({ onComplete }: ParentOnboardingProps) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'add-child' | 'subscription-info'>('add-child');
  const [addedChildren, setAddedChildren] = useState<Array<{full_name: string; age: number; grade_level: string; character_type: string; accessories: string[]}>>([]);
  const [newChildData, setNewChildData] = useState({
    full_name: '',
    age: '',
    grade_level: '',
    character_type: 'explorer',
    accessories: [] as string[]
  });
  const [showChildForm, setShowChildForm] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedSubscription, setAcceptedSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({ childrenCount: 1, monthlyPrice: 2, planType: 'basic' });
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyCachedRegistrationPlan() {
    const cached = readCachedRegistrationPlan();
    if (!cached) {
      return false;
    }

    const planDetails = PLAN_OPTION_MAP[cached.planId];
    if (!planDetails) {
      return false;
    }

    const fallbackChildren = Math.max(cached.children, planDetails.childrenCount);

    setSubscriptionInfo({
      childrenCount: Math.max(fallbackChildren, 1),
      monthlyPrice: planDetails.monthlyPrice,
      planType: cached.planId,
    });
    setSelectedPlan(cached.planId);
    setSubscriptionError(null);

    return true;
  }

  useEffect(() => {
    loadSubscription();
  }, [user]);

  async function loadSubscription() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, children_count, price, status')
        .eq('user_id', user.id)
        .maybeSingle();

      const shouldAttemptLegacyLookup = error ? shouldAttemptLegacySubscriptionLookup(error) : false;

      if (error && !shouldAttemptLegacyLookup) {
        throw error;
      }

      let record: SubscriptionRecord | null = data;

      if (!record && shouldAttemptLegacyLookup) {
        const { data: legacyData, error: legacyError } = await supabase
          .from('subscriptions')
          .select('plan_type, children_count, price, status')
          .eq('parent_id', user.id)
          .maybeSingle();

        if (legacyError) {
          recordLegacySubscriptionLookupFailure(legacyError);
          if (!isMissingColumnError(legacyError)) {
            throw legacyError;
          }
        } else {
          record = legacyData;
          if (record) {
            recordLegacySubscriptionLookupSuccess();
          }
        }
      }

      setSubscription(record);

      if (record) {
        const normalizedPlan = normalizePlanType(record.plan_type);
        const planDetails = PLAN_OPTION_MAP[normalizedPlan];
        const includedChildren = record.children_count && record.children_count > 0
          ? record.children_count
          : planDetails?.childrenCount ?? 1;
        const monthlyPrice = record.price ?? planDetails?.monthlyPrice ?? 0;

        setSubscriptionInfo({
          childrenCount: Math.max(includedChildren, 1),
          monthlyPrice,
          planType: normalizedPlan,
        });
        setSelectedPlan(normalizedPlan);
        setSubscriptionError(null);
        clearCachedRegistrationPlan();
      } else {
        applyCachedRegistrationPlan();
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setSubscription(null);
      if (!applyCachedRegistrationPlan()) {
        setSubscriptionError("Nous n'avons pas pu récupérer les informations de votre abonnement. Vos enfants seront tout de même enregistrés.");
      }
    } finally {
      setLoading(false);
    }
  }

  const normalizedPlanType = useMemo(() => {
    if (subscription) {
      return normalizePlanType(subscription.plan_type);
    }
    return inferPlanFromCount(addedChildren.length || 1);
  }, [subscription, addedChildren.length]);

  const planDetails = PLAN_OPTION_MAP[normalizedPlanType];
  const includedChildren = useMemo(() => {
    if (subscription?.children_count && subscription.children_count > 0) {
      return subscription.children_count;
    }
    return planDetails?.childrenCount ?? 1;
  }, [subscription, planDetails]);

  const normalizedIncludedChildren = useMemo(() => Math.max(includedChildren, 1), [includedChildren]);
  const isUnlimitedPlan = planDetails?.isUnlimited ?? false;
  const remainingChildren = normalizedIncludedChildren - addedChildren.length;
  const hasReachedLimit = !isUnlimitedPlan && remainingChildren <= 0;
  const displayTotalChildren = isUnlimitedPlan
    ? `${normalizedIncludedChildren}+`
    : normalizedIncludedChildren.toString();
  const priceLabel = subscription?.price ?? planDetails?.monthlyPrice ?? null;

  async function handleAddChild() {
    if (!user || !newChildData.full_name || !newChildData.age || !newChildData.grade_level) {
      return;
    }

    if (hasReachedLimit) {
      setError('Vous avez déjà ajouté tous les enfants inclus dans votre formule.');
      return;
    }

    setAddingChild(true);
    try {
      const { data: childProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          full_name: newChildData.full_name,
          age: parseInt(newChildData.age),
          grade_level: newChildData.grade_level,
          parent_id: user.id,
          role: 'child',
          onboarding_completed: true,
          email: null
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create avatar for the child
      const { error: avatarError } = await supabase
        .from('avatars')
        .insert({
          child_id: childProfile.id,
          character_type: newChildData.character_type,
          accessories: newChildData.accessories
        });

      if (avatarError) {
        console.error('Error creating avatar:', avatarError);
      }

      // Add to the list of added children
      const newChild = {
        full_name: newChildData.full_name,
        age: parseInt(newChildData.age),
        grade_level: newChildData.grade_level,
        character_type: newChildData.character_type,
        accessories: newChildData.accessories
      };
      setAddedChildren((current) => [...current, newChild]);
      setError(null);

      // Reset form
      setNewChildData({
        full_name: '',
        age: '',
        grade_level: '',
        character_type: 'explorer',
        accessories: []
      });
      setShowChildForm(false);

    } catch (err: any) {
      console.error('Error adding child:', err);
      alert('Erreur lors de l\'ajout de l\'enfant: ' + err.message);
    } finally {
      setAddingChild(false);
    }
  }

  function handleNextStep() {
    if (addedChildren.length === 0) {
      alert('Veuillez ajouter au moins un enfant pour continuer.');
      return;
    }

    const planType = subscription ? normalizePlanType(subscription.plan_type) : inferPlanFromCount(addedChildren.length);
    const plan = PLAN_OPTION_MAP[planType];
    const childrenCount = subscription?.children_count && subscription.children_count > 0
      ? subscription.children_count
      : plan?.childrenCount ?? Math.max(addedChildren.length, 1);
    const monthlyPrice = subscription?.price ?? plan?.monthlyPrice ?? 0;

    setSelectedPlan(planType);
    setSubscriptionInfo({
      childrenCount: Math.max(childrenCount, 1),
      monthlyPrice,
      planType
    });

    setStep('subscription-info');
  }

  function handlePlanSelection(planId: PlanId) {
    setSelectedPlan(planId);
    const plan = PLAN_OPTIONS.find(p => p.id === planId)!;
    setSubscriptionInfo({
      childrenCount: plan.childrenCount,
      monthlyPrice: plan.monthlyPrice,
      planType: plan.id
    });
  }

  async function handleCompleteOnboarding() {
    if (!user) return;

    try {
      // Mark parent onboarding as completed
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      // Send subscription confirmation email via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-confirmation`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            childrenCount: subscriptionInfo.childrenCount,
            monthlyPrice: subscriptionInfo.monthlyPrice
          }),
        });
      }

      clearCachedRegistrationPlan();
      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      clearCachedRegistrationPlan();
      onComplete();
    }
  }

  async function handleSkipForNow() {
    if (!user) return;

    try {
      // Mark onboarding as completed even without adding a child
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      clearCachedRegistrationPlan();
      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }


  const characterTypes = [
    { id: 'explorer', name: 'Explorateur', emoji: '🧑‍🚀' },
    { id: 'scientist', name: 'Scientifique', emoji: '🧑‍🔬' },
    { id: 'artist', name: 'Artiste', emoji: '🧑‍🎨' },
    { id: 'athlete', name: 'Sportif', emoji: '🏃' },
    { id: 'musician', name: 'Musicien', emoji: '🧑‍🎤' },
    { id: 'wizard', name: 'Magicien', emoji: '🧙' },
  ];

  const accessories = [
    { id: 'glasses', name: 'Lunettes', emoji: '👓' },
    { id: 'hat', name: 'Chapeau', emoji: '🎩' },
    { id: 'crown', name: 'Couronne', emoji: '👑' },
    { id: 'star', name: 'Étoile', emoji: '⭐' },
    { id: 'medal', name: 'Médaille', emoji: '🏅' },
    { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈' },
  ];

  function toggleAccessory(accessoryId: string) {
    if (newChildData.accessories.includes(accessoryId)) {
      setNewChildData({
        ...newChildData,
        accessories: newChildData.accessories.filter(id => id !== accessoryId)
      });
    } else {
      setNewChildData({
        ...newChildData,
        accessories: [...newChildData.accessories, accessoryId]
      });
    }
  }

  // Step 1: Add child form (merged with welcome)
  const renderAddChildStep = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 relative">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Logo size={56} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          Bienvenue sur PioPi !
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          Commencez par ajouter vos enfants
        </p>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-gray-300"
          title="Se déconnecter"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-left mt-6 mb-4">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Baby className="text-blue-600" size={20} />
            Comment ça marche ?
          </h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</span>
              <span><strong>Ajoutez vos enfants</strong> avec leur prénom, âge et niveau scolaire</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</span>
              <span><strong>Personnalisez leur avatar</strong> en choisissant un personnage et des accessoires</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</span>
              <span><strong>Choisissez votre plan</strong> adapté au nombre d'enfants</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">4</span>
              <span><strong>C'est parti !</strong> Vos enfants peuvent commencer à apprendre en s'amusant</span>
            </li>
          </ol>
        </div>

        {subscriptionError && (
          <div className="mb-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-800 text-sm">
            {subscriptionError}
          </div>
        )}

        {planDetails && (
          <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-2xl p-6 text-left text-white shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-100">Votre formule</p>
                <h2 className="text-2xl font-black mt-1">{planDetails.name}</h2>
                <p className="text-sm text-blue-100/90 mt-1">{planDetails.description}</p>
                {priceLabel !== null && (
                  <p className="mt-3 text-lg font-semibold text-white">
                    {priceLabel.toFixed(2)}€ / mois
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users size={26} className="text-white" />
              </div>
            </div>

            <div className="mt-6 bg-white/15 rounded-xl p-4">
              <p className="text-sm font-semibold">
                Enfants ajoutés :{' '}
                <span className="text-white text-lg">{addedChildren.length}</span>
                <span className="text-blue-100 mx-1">/</span>
                <span className="text-white text-lg">{displayTotalChildren}</span>
              </p>
              <p className="text-xs text-blue-100 mt-2">
                {remainingChildren > 0 && !isUnlimitedPlan && (
                  <>Il vous reste {remainingChildren} enfant{remainingChildren > 1 ? 's' : ''} à ajouter.</>
                )}
                {remainingChildren === 0 && !isUnlimitedPlan && (
                  <>Tous les enfants inclus dans votre offre ont été ajoutés.</>
                )}
                {isUnlimitedPlan && remainingChildren > 0 && (
                  <>Il vous reste {remainingChildren} enfant{remainingChildren > 1 ? 's' : ''} inclus avant facturation supplémentaire.</>
                )}
                {isUnlimitedPlan && remainingChildren <= 0 && (
                  <>Vous pouvez ajouter d'autres enfants : ils seront facturés selon votre formule Liberté.</>
                )}
                {!isUnlimitedPlan && remainingChildren < 0 && (
                  <>Vous avez dépassé la limite incluse de votre offre de {Math.abs(remainingChildren)} enfant{Math.abs(remainingChildren) > 1 ? 's' : ''}. Pensez à mettre à jour votre abonnement.</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {addedChildren.length === 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <p className="font-bold text-green-900 mb-2">🎉 Offre de bienvenue</p>
              <ul className="space-y-1 text-sm text-green-800">
                <li>✓ Premier mois gratuit</li>
                <li>✓ Seulement 2€ par enfant par mois ensuite</li>
                <li>✓ Sans engagement - Annulation à tout moment</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {addedChildren.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Enfants ajoutés ({addedChildren.length})</h3>
          <div className="space-y-2">
            {addedChildren.map((child, index) => {
              const character = characterTypes.find(c => c.id === child.character_type);
              return (
                <div key={index} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-3xl">{character?.emoji || '👤'}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{child.full_name}</p>
                    <p className="text-sm text-gray-600">{child.age} ans - {child.grade_level}</p>
                  </div>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!showChildForm ? (
        <>
          <button
            onClick={() => {
              setError(null);
              setShowChildForm(true);
            }}
            disabled={hasReachedLimit}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={24} />
            Ajouter un enfant
          </button>
          {hasReachedLimit && (
            <p className="mt-3 text-sm text-blue-700 text-center font-semibold">
              Vous avez ajouté tous les enfants inclus dans votre offre.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newChildData.full_name}
              onChange={(e) => setNewChildData({ ...newChildData, full_name: e.target.value })}
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-lg"
              placeholder="Ex: Marie"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Âge <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={newChildData.age}
              onChange={(e) => setNewChildData({ ...newChildData, age: e.target.value })}
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-lg"
              placeholder="Ex: 8"
              min="5"
              max="18"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Niveau scolaire <span className="text-red-500">*</span>
            </label>
            <select
              value={newChildData.grade_level}
              onChange={(e) => setNewChildData({ ...newChildData, grade_level: e.target.value })}
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-lg"
            >
              <option value="">Sélectionnez un niveau</option>
              <option value="CP">CP</option>
              <option value="CE1">CE1</option>
              <option value="CE2">CE2</option>
              <option value="CM1">CM1</option>
              <option value="CM2">CM2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Choisir un personnage <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {characterTypes.map((character) => (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => setNewChildData({ ...newChildData, character_type: character.id })}
                  className={`p-4 border-2 rounded-xl transition ${
                    newChildData.character_type === character.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{character.emoji}</div>
                  <p className="text-sm font-semibold text-gray-700">{character.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Accessoires (optionnel)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {accessories.map((accessory) => (
                <button
                  key={accessory.id}
                  type="button"
                  onClick={() => toggleAccessory(accessory.id)}
                  className={`p-4 border-2 rounded-xl transition ${
                    newChildData.accessories.includes(accessory.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{accessory.emoji}</div>
                  <p className="text-xs font-semibold text-gray-700">{accessory.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
          <button
            onClick={() => {
              setShowChildForm(false);
              setNewChildData({
                full_name: '',
                age: '',
                grade_level: '',
                character_type: 'explorer',
                accessories: []
              });
              setError(null);
            }}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
          >
            Annuler
          </button>
          <button
            onClick={handleAddChild}
            disabled={!newChildData.full_name || !newChildData.age || !newChildData.grade_level || addingChild || hasReachedLimit}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {addingChild ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Ajout...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Ajouter
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>
      )}

      {addedChildren.length > 0 && !showChildForm && (
        <button
          onClick={handleNextStep}
          className="w-full py-4 mt-4 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-bold rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <ArrowRight size={20} />
          Suivant
        </button>
      )}
    </div>
  );

  // Step 2: Subscription info
  const renderSubscriptionInfoStep = () => {
    const activePlan = selectedPlan ?? normalizedPlanType;
    const formattedMonthlyPrice = subscriptionInfo.monthlyPrice.toFixed(2);

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <CheckCircle className="text-blue-500" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Récapitulatif de votre abonnement
          </h2>
          <p className="text-gray-600">
            Vérifiez les informations avant de continuer
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Enfants inscrits ({addedChildren.length})</h3>
          <div className="space-y-2">
            {addedChildren.map((child, index) => (
              <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <CheckCircle className="text-blue-600" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{child.full_name}</p>
                  <p className="text-sm text-gray-600">{child.age} ans - {child.grade_level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Votre abonnement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {PLAN_OPTIONS.map((plan) => {
              const isSelected = plan.id === activePlan;
              const canSelect = plan.id === activePlan;

              return (
                <button
                  key={plan.id}
                  onClick={() => canSelect && handlePlanSelection(plan.id)}
                  disabled={!canSelect}
                  className={`relative p-5 rounded-xl border-2 transition text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className="text-white" size={16} />}
                    </div>
                  </div>
                  <div className="text-3xl font-black text-blue-600">
                    {plan.monthlyPrice.toFixed(2)}€<span className="text-lg font-semibold text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.pricePerChild.toFixed(2)}€ par enfant
                  </p>
                  {!isSelected && (
                    <p className="text-xs text-gray-500 mt-2">
                      Plan sélectionné automatiquement lors de votre inscription
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Votre abonnement sélectionné
              </h3>
              <div className="flex items-center justify-center gap-3">
                <Users className="text-blue-500" size={28} />
                <p className="text-3xl font-black text-gray-900">
                  {subscriptionInfo.childrenCount} enfant{subscriptionInfo.childrenCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-white rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-gray-700">
                  <strong>Sans engagement</strong> - Annulation à tout moment
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-gray-700">
                  <strong>Essai gratuit activé</strong> - Profitez de l'expérience complète dès aujourd'hui
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-gray-700">
                  <strong>Paiement sécurisé enregistré</strong> - Votre moyen de paiement est prêt pour la suite
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Important :</strong> Votre période d'essai gratuit vient de commencer. Vous pourrez annuler à tout moment depuis les paramètres.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition hover:bg-gray-50 ${acceptedSubscription ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
            <input
              type="checkbox"
              checked={acceptedSubscription}
              onChange={(e) => setAcceptedSubscription(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 font-semibold">
              Je confirme mon abonnement de {formattedMonthlyPrice}€/mois pour {subscriptionInfo.childrenCount} enfant{subscriptionInfo.childrenCount > 1 ? 's' : ''}
            </span>
          </label>

          <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition hover:bg-gray-50 ${acceptedTerms ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              J'accepte les{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:underline font-semibold">
                conditions d'utilisation
              </a>
              {' '}et la{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:underline font-semibold">
                politique de confidentialité
              </a>
              {' '}d'PioPi.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('add-child')}
            className="flex-1 py-4 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-xl transition text-lg flex items-center justify-center gap-2"
          >
            <Edit size={20} />
            Modifier
          </button>
          <button
            onClick={handleCompleteOnboarding}
            disabled={!acceptedTerms || !acceptedSubscription}
            className="flex-1 py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <ArrowRight size={20} />
            Commencer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {step === 'add-child' && renderAddChildStep()}
        {step === 'subscription-info' && renderSubscriptionInfoStep()}
      </div>
    </div>
  );
}
