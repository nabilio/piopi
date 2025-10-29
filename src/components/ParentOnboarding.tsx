import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, LogOut, Baby, UserPlus, Sparkles, Plus } from 'lucide-react';
import { Logo } from './Logo';
import { PlanSelection } from './PlanSelection';
import { useTrialConfig } from '../hooks/useTrialConfig';

type ParentOnboardingProps = {
  onComplete: () => void;
};

type ParentSubscription = {
  plan_type: string | null;
  children_count: number;
  trial_end_date: string | null;
};

const PLAN_CHILD_LIMITS: Record<string, number> = {
  basic: 1,
  duo: 2,
  family: 3,
  premium: 4,
  liberte: 999,
};

export function ParentOnboarding({ onComplete }: ParentOnboardingProps) {
  const { user, signOut } = useAuth();
  const { formattedBaseTrial } = useTrialConfig();
  const [initializing, setInitializing] = useState(true);
  const [step, setStep] = useState<'plan' | 'add-child'>('plan');
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
  const [subscription, setSubscription] = useState<ParentSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);
  const [existingChildrenCount, setExistingChildrenCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadSubscription();
  }, [user]);

  async function loadSubscription() {
    if (!user) return;

    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, children_count, trial_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSubscription(data);
        setStep('add-child');
        await refreshChildrenCount();
      } else {
        setSubscription(null);
        setStep('plan');
        setExistingChildrenCount(0);
      }
    } catch (err) {
      console.error('Error loading subscription during onboarding:', err);
      setSubscription(null);
      setStep('plan');
    } finally {
      setSubscriptionLoading(false);
      setInitializing(false);
    }
  }

  async function refreshChildrenCount() {
    if (!user) return;

    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('role', 'child');

    if (error) {
      console.error('Erreur lors du comptage des enfants existants:', error);
      return;
    }

    setExistingChildrenCount(count || 0);
  }

  async function handleAddChild() {
    if (!user || !newChildData.full_name || !newChildData.age || !newChildData.grade_level) {
      return;
    }

    if (!subscription) {
      setCompletionError("Veuillez d'abord confirmer votre abonnement avant d'ajouter un enfant.");
      return;
    }

    const maxChildrenAllowed = PLAN_CHILD_LIMITS[subscription.plan_type || ''] || subscription.children_count || 1;

    if (existingChildrenCount >= maxChildrenAllowed) {
      const limitLabel = maxChildrenAllowed >= 999
        ? "la formule Liberté (ajoutez autant d'enfants que souhaité)"
        : `${maxChildrenAllowed} enfant${maxChildrenAllowed > 1 ? 's' : ''}`;
      setCompletionError(`Vous avez atteint la limite de ${limitLabel} pour votre offre.`);
      return;
    }

    setCompletionError(null);
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
      setAddedChildren([...addedChildren, newChild]);
      setExistingChildrenCount((count) => count + 1);

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

  async function handleCompleteOnboarding() {
    if (!user) return;

    if (!subscription) {
      setCompletionError("Merci de choisir votre formule avant de finaliser l'onboarding.");
      return;
    }

    if (existingChildrenCount === 0) {
      setCompletionError('Ajoutez au moins un enfant pour continuer.');
      return;
    }

    setCompletionError(null);
    setCompletingOnboarding(true);

    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setCompletionError("Une erreur est survenue lors de la finalisation. Veuillez réessayer.");
    } finally {
      setCompletingOnboarding(false);
    }
  }

  const planLabels: Record<string, string> = {
    'basic': 'Basique',
    'duo': 'Duo',
    'family': 'Famille',
    'premium': 'Premium',
    'liberte': 'Liberté',
    'monthly': 'Mensuel',
    'yearly': 'Annuel'
  };

  const selectedPlanLabel = subscription?.plan_type ? (planLabels[subscription.plan_type] || subscription.plan_type) : null;
  const trialEndDate = subscription?.trial_end_date ? new Date(subscription.trial_end_date) : null;
  const maxChildrenAllowed = subscription ? (PLAN_CHILD_LIMITS[subscription.plan_type || ''] || subscription.children_count || 1) : 0;
  const hasReachedChildLimit = subscription ? existingChildrenCount >= maxChildrenAllowed : false;

  if (initializing || subscriptionLoading) {
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

  const renderPlanStep = () => (
    <PlanSelection
      onComplete={async () => {
        setCompletionError(null);
        await loadSubscription();
      }}
    />
  );

  // Step 2: Add child form (merged with welcome)
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
              <span><strong>Votre essai de {formattedBaseTrial}</strong> est activé avec la formule sélectionnée</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</span>
              <span><strong>Ajoutez vos enfants</strong> avec leur prénom, âge et niveau scolaire</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</span>
              <span><strong>Personnalisez leur avatar</strong> et invitez-les à rejoindre l'aventure</span>
            </li>
          </ol>
        </div>
      </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 text-left mb-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Sparkles className="text-blue-600" size={20} />
            Votre abonnement est prêt
          </h3>
          <div className="space-y-1 text-sm text-blue-800">
            {selectedPlanLabel && (
              <p><strong>Formule :</strong> {selectedPlanLabel} ({subscription?.children_count} enfant{subscription && subscription.children_count > 1 ? 's' : ''})</p>
            )}
            <p><strong>Essai gratuit :</strong> {formattedBaseTrial}</p>
            {trialEndDate && (
              <p><strong>Prochain prélèvement estimé :</strong> {trialEndDate.toLocaleDateString('fr-FR')}</p>
            )}
            <p><strong>Annulation :</strong> possible à tout moment avant la fin de l'essai</p>
            <p>
              <strong>Limite d'enfants :</strong>{' '}
              {maxChildrenAllowed >= 999 ? 'Illimitée (formule Liberté)' : `${maxChildrenAllowed} enfant${maxChildrenAllowed > 1 ? 's' : ''}`}
            </p>
            <p><strong>Enfants déjà ajoutés :</strong> {existingChildrenCount}</p>
          </div>
        </div>

      {completionError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
          {completionError}
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

      {hasReachedChildLimit && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-900 text-sm">
          Vous avez atteint la limite d'enfants incluse dans votre formule {selectedPlanLabel || 'actuelle'}. Pour ajouter d'autres profils, veuillez mettre à jour votre abonnement.
        </div>
      )}

      {!showChildForm && !hasReachedChildLimit ? (
        <button
          onClick={() => setShowChildForm(true)}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <Plus size={24} />
          Ajouter un enfant
        </button>
      ) : (!hasReachedChildLimit && (
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
              }}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleAddChild}
              disabled={!newChildData.full_name || !newChildData.age || !newChildData.grade_level || addingChild}
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
        </div>
      ))}

      {addedChildren.length > 0 && !showChildForm && (
        <button
          onClick={handleCompleteOnboarding}
          disabled={completingOnboarding}
          className="w-full py-4 mt-4 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-bold rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {completingOnboarding ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Finalisation...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Terminer l'onboarding
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {step === 'plan' && renderPlanStep()}
        {step === 'add-child' && renderAddChildStep()}
      </div>
    </div>
  );
}
