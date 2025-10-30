import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { Check, ArrowRight, Users, Tag, Info, Sparkles, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTrialConfig, formatTrialDuration } from '../hooks/useTrialConfig';
import { createStripeCheckout, verifyStripeCheckout } from '../utils/payment';
import { useAuth } from '../contexts/AuthContext';

type PlanId = 'basic' | 'duo' | 'family' | 'premium' | 'liberte';

type PricingPlan = {
  id: PlanId;
  children: number;
  monthlyPrice: number;
  yearlyPrice: number;
  label: string;
  description: string;
};

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    children: 1,
    monthlyPrice: 2.0,
    yearlyPrice: 20.0,
    label: 'Solo',
    description: 'Parfait pour un premier explorateur',
  },
  {
    id: 'duo',
    children: 2,
    monthlyPrice: 3.0,
    yearlyPrice: 30.0,
    label: 'Duo',
    description: 'Idéal pour deux enfants complices',
  },
  {
    id: 'family',
    children: 3,
    monthlyPrice: 5.0,
    yearlyPrice: 50.0,
    label: 'Famille',
    description: 'Pour une tribu motivée',
  },
  {
    id: 'premium',
    children: 4,
    monthlyPrice: 6.0,
    yearlyPrice: 60.0,
    label: 'Premium',
    description: 'Tous les héros sous le même toit',
  },
  {
    id: 'liberte',
    children: 5,
    monthlyPrice: 8.0,
    yearlyPrice: 80.0,
    label: 'Liberté',
    description: 'Pour les familles nombreuses (5+)',
  },
];

type PlanSelectionProps = {
  onComplete: () => void;
  allowAccountCreation?: boolean;
  onCancel?: () => void;
};

type FlowStep = 'plan-selection' | 'account' | 'payment' | 'confirmation';

type PendingCheckoutPayload = {
  planId: PlanId;
  childrenCount: number;
  price: number;
  sessionId: string;
  promoCode?: string;
  promoMonths?: number;
  totalTrialDays: number;
};

const PENDING_CHECKOUT_KEY = 'pendingSubscriptionCheckout';

export function PlanSelection({ onComplete, allowAccountCreation = false, onCancel }: PlanSelectionProps) {
  const { user, signUp } = useAuth();
  const [selectedChildren, setSelectedChildren] = useState(1);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState('');
  const [promoValidation, setPromoValidation] = useState<{ valid: boolean; message?: string; free_months?: number } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [step, setStep] = useState<FlowStep>('plan-selection');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [finalizingCheckout, setFinalizingCheckout] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const {
    baseTrialDays,
    formattedBaseTrial,
    promoHeadline: trialHeadline,
    activeDescription,
    loading: trialConfigLoading,
  } = useTrialConfig();

  const hasAccountStep = allowAccountCreation && !user;

  const selectedPlan = PRICING_PLANS.find((plan) => plan.children === selectedChildren) || PRICING_PLANS[0];
  const price = billingPeriod === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
  const pricePerChild = price / selectedChildren;

  const promoExtraDays = useMemo(() => {
    if (!promoValidation?.valid) return 0;
    return (promoValidation.free_months || 0) * 30;
  }, [promoValidation]);

  const totalTrialDays = baseTrialDays + promoExtraDays;
  const formattedTotalTrial = formatTrialDuration(totalTrialDays);
  const summaryTrialLabel = promoValidation?.valid ? formattedTotalTrial : formattedBaseTrial;
  const firstChargeDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + totalTrialDays);
    return date;
  }, [totalTrialDays]);

  if (trialConfigLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-600 font-semibold">Chargement de votre offre d'essai...</p>
        </div>
      </div>
    );
  }

  async function validatePromoCode() {
    if (!promoCode) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        promo_code_input: promoCode,
      });

      if (error) throw error;

      setPromoValidation(data);
    } catch (error: unknown) {
      console.error('Promo code validation error:', error);
      setPromoValidation({ valid: false, message: 'Erreur lors de la validation du code' });
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError('');

    if (creatingAccount) {
      return;
    }

    if (!accountForm.fullName.trim()) {
      setAccountError('Veuillez renseigner votre nom.');
      return;
    }

    if (!accountForm.email.trim()) {
      setAccountError('Veuillez renseigner votre email.');
      return;
    }

    if (accountForm.password.length < 6) {
      setAccountError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountError('Les mots de passe ne correspondent pas.');
      return;
    }

    setCreatingAccount(true);
    try {
      await signUp(
        accountForm.email.trim(),
        accountForm.password,
        accountForm.fullName.trim(),
        'parent',
      );
      setAccountCreated(true);
      setAccountError('');
      setStep('payment');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de créer le compte.';
      setAccountError(message);
    } finally {
      setCreatingAccount(false);
    }
  }

  const finalizeCheckout = useCallback(
    async (pending: PendingCheckoutPayload, sessionId: string) => {
      setError('');

      try {
        const verification = await verifyStripeCheckout(sessionId);
        const paymentStatus = verification.paymentStatus ?? '';
        if (verification.status !== 'complete' || !['paid', 'no_payment_required', 'unpaid'].includes(paymentStatus)) {
          throw new Error("Le paiement n'a pas été validé.");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Utilisateur non authentifié');
        }

        const selectedPlanConfig = PRICING_PLANS.find((plan) => plan.id === pending.planId) || PRICING_PLANS[0];
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + pending.totalTrialDays);

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              plan_type: pending.planId,
              children_count: pending.childrenCount,
              price: pending.price,
              status: 'trial',
              trial_start_date: trialStartDate.toISOString(),
              trial_end_date: trialEndDate.toISOString(),
              promo_code: pending.promoCode || null,
              promo_months_remaining: pending.promoMonths || 0,
            },
            { onConflict: 'user_id' },
          );

        if (subscriptionError) throw subscriptionError;

        await supabase.from('subscription_history').insert({
          user_id: user.id,
          children_count: pending.childrenCount,
          price: pending.price,
          plan_type: pending.planId,
          action_type: 'trial_started',
          notes:
            pending.promoCode && pending.promoMonths
              ? `Essai gratuit de ${formatTrialDuration(pending.totalTrialDays)} démarré avec le code promo: ${pending.promoCode}`
              : `Essai gratuit de ${formatTrialDuration(pending.totalTrialDays)} démarré`,
        });

        if (pending.promoCode && pending.promoMonths) {
          await supabase.rpc('increment_promo_usage', {
            promo_code_input: pending.promoCode,
          });
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-confirmation`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: user.email,
                childrenCount: pending.childrenCount,
                monthlyPrice: selectedPlanConfig.monthlyPrice,
              }),
            });
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
          }
        }

        localStorage.removeItem(PENDING_CHECKOUT_KEY);
        setStep('confirmation');
        onComplete();
      } catch (error: unknown) {
        console.error('Subscription finalization error:', error);
        const message = error instanceof Error ? error.message : "Erreur lors de la finalisation de l'abonnement";
        setError(message);
        localStorage.removeItem(PENDING_CHECKOUT_KEY);
      }
    },
    [onComplete],
  );

  useEffect(() => {
    if (trialConfigLoading) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout_status');
    const provider = params.get('provider');
    const sessionId = params.get('session_id');

    if (!checkoutStatus) {
      return;
    }

    if (provider !== 'stripe') {
      params.delete('checkout_status');
      params.delete('provider');
      params.delete('session_id');
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
      return;
    }

    if (checkoutStatus === 'success' && sessionId) {
      const pendingRaw = localStorage.getItem(PENDING_CHECKOUT_KEY);
      if (!pendingRaw) {
        setError('Impossible de confirmer le paiement : session introuvable.');
        localStorage.removeItem(PENDING_CHECKOUT_KEY);
      } else {
        try {
          const pending = JSON.parse(pendingRaw) as PendingCheckoutPayload;
          const matchingPlan = PRICING_PLANS.find((plan) => plan.id === pending.planId);
          if (matchingPlan) {
            setSelectedChildren(matchingPlan.children);
          }
          setStep('payment');
          setFinalizingCheckout(true);
          finalizeCheckout(pending, sessionId).finally(() => {
            setFinalizingCheckout(false);
          });
        } catch (parseError) {
          console.error('Failed to parse pending checkout payload:', parseError);
          setError('Une erreur est survenue lors de la récupération du paiement.');
          localStorage.removeItem(PENDING_CHECKOUT_KEY);
        }
      }
    } else if (checkoutStatus === 'cancel') {
      setStep('payment');
      setError('Paiement annulé. Vous pouvez réessayer.');
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
    }

    params.delete('checkout_status');
    params.delete('provider');
    params.delete('session_id');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [finalizeCheckout, trialConfigLoading]);

  if (trialConfigLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-600 font-semibold">Chargement de votre offre d'essai...</p>
        </div>
      </div>
    );
  }

  async function handleStartPayment() {
    if (billingPeriod === 'yearly') {
      setError("Le paiement annuel sera bientôt disponible. Choisissez l'option mensuelle pour commencer votre essai.");
      return;
    }

    if (!user) {
      setError('Veuillez créer votre compte parent avant de poursuivre vers le paiement.');
      if (hasAccountStep) {
        setStep('account');
      }
      return;
    }

    setError('');
    setProcessingCheckout(true);

    try {
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set('checkout_status', 'success');
      successUrl.searchParams.set('provider', 'stripe');

      const cancelUrl = new URL(window.location.href);
      cancelUrl.searchParams.set('checkout_status', 'cancel');
      cancelUrl.searchParams.set('provider', 'stripe');

      const checkout = await createStripeCheckout({
        planId: selectedPlan.id,
        childrenCount: selectedPlan.children,
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString(),
        trialPeriodDays: totalTrialDays,
      });

      const pendingPayload: PendingCheckoutPayload = {
        planId: selectedPlan.id,
        childrenCount: checkout.billedChildren,
        price: checkout.amount,
        sessionId: checkout.sessionId,
        promoCode: promoValidation?.valid ? promoCode.trim().toUpperCase() : undefined,
        promoMonths: promoValidation?.valid ? promoValidation.free_months || 0 : undefined,
        totalTrialDays,
      };

      localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pendingPayload));

      window.location.href = checkout.url;
    } catch (error: unknown) {
      console.error('Checkout initiation error:', error);
      setProcessingCheckout(false);
      const message = error instanceof Error ? error.message : 'Impossible de lancer le paiement.';
      setError(message);
    }
  }

  const stepOrder = useMemo<FlowStep[]>(
    () =>
      hasAccountStep
        ? ['plan-selection', 'account', 'payment', 'confirmation']
        : ['plan-selection', 'payment', 'confirmation'],
    [hasAccountStep],
  );

  const currentStepIndex = stepOrder.indexOf(step);

  const planStep = (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <div className="mb-10">
        <h3 className="text-center text-xl font-bold text-gray-800 mb-4">Choisissez votre période de facturation</h3>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-8 py-4 rounded-xl font-bold transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="inline-block mr-2" size={20} />
            Mensuel
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-8 py-4 rounded-xl font-bold transition-all relative ${
              billingPeriod === 'yearly'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="inline-block mr-2" size={20} />
            Annuel
            <span className="absolute -top-3 -right-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
              Économisez 17%
            </span>
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8 mb-8"></div>

      <div className="mb-10">
        <h3 className="text-center text-xl font-bold text-gray-800 mb-4">Combien d'enfants souhaitez-vous inscrire ?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const planPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const perChild = planPrice / plan.children;
            const isSelected = selectedChildren === plan.children;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedChildren(plan.children)}
                className={`p-6 rounded-2xl border-4 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{plan.label}</div>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                  <Users className={isSelected ? 'text-blue-500' : 'text-gray-400'} size={28} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {plan.children === 5 ? '5+' : plan.children}
                </div>
                <div className="text-sm text-gray-600 mb-3">{plan.children === 1 ? 'enfant inclus' : 'enfants inclus'}</div>
                <div className="text-2xl font-bold text-gray-900">{planPrice.toFixed(2)}€</div>
                <div className="text-xs text-gray-500">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</div>
                <div className="text-xs text-gray-500 mt-2">{perChild.toFixed(2)}€ par enfant</div>
              </button>
            );
          })}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-800">Vous pourrez ajouter ou retirer des profils d'enfants à tout moment depuis vos paramètres.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8 mb-6"></div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg mb-6">
            <Sparkles size={20} />
            Essai gratuit de {summaryTrialLabel}
          </div>
          <div className="text-4xl font-black text-gray-900 mb-3">
            {price.toFixed(2)} €<span className="text-xl text-gray-600 font-normal ml-2">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
          </div>
          <p className="text-sm text-gray-600">
            Pour {selectedChildren} {selectedChildren === 1 ? 'enfant' : 'enfants'} — soit {pricePerChild.toFixed(2)}€ par enfant
          </p>
        </div>

        <div className="space-y-3 text-left max-w-2xl mx-auto">
          <div className="text-lg font-bold text-gray-800 mb-4">Ce qui est inclus :</div>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
              <Check className="text-white" size={16} />
            </div>
            <div>
              <span className="font-semibold">Accès complet au programme scolaire français</span>
              <p className="text-sm text-gray-600">Du CP au CM2, toutes les matières</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
              <Check className="text-white" size={16} />
            </div>
            <div>
              <span className="font-semibold">Leçons interactives et quiz personnalisés</span>
              <p className="text-sm text-gray-600">Adaptés au niveau de chaque enfant</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
              <Check className="text-white" size={16} />
            </div>
            <div>
              <span className="font-semibold">Suivi des progrès en temps réel</span>
              <p className="text-sm text-gray-600">Tableau de bord parent détaillé</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
              <Check className="text-white" size={16} />
            </div>
            <div>
              <span className="font-semibold">Système de gamification et récompenses</span>
              <p className="text-sm text-gray-600">Points, badges et défis motivants</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-gray-700">
            <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
              <Check className="text-white" size={16} />
            </div>
            <div>
              <span className="font-semibold">Réseau social sécurisé entre enfants</span>
              <p className="text-sm text-gray-600">Partage de réussites et défis entre amis</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          setError('');
          setAccountError('');
          setStep(hasAccountStep ? 'account' : 'payment');
        }}
        className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-xl rounded-xl hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
      >
        Continuer vers le paiement
        <ArrowRight size={24} />
      </button>
    </div>
  );

  const accountStep = (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto">
      <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Créez votre compte parent</h3>
      <p className="text-center text-gray-600 mb-6">
        Configurez votre accès sécurisé pour gérer vos enfants et suivre leur progression.
      </p>
      {accountError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold text-center">
          {accountError}
        </div>
      )}
      <form onSubmit={handleCreateAccount} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Votre nom complet</label>
          <input
            type="text"
            value={accountForm.fullName}
            onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
            placeholder="Ex: Marie Dupont"
            className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Adresse email</label>
          <input
            type="email"
            value={accountForm.email}
            onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
            placeholder="vous@email.com"
            className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Mot de passe</label>
            <input
              type="password"
              value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              placeholder="Minimum 6 caractères"
              className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Confirmez le mot de passe</label>
            <input
              type="password"
              value={accountForm.confirmPassword}
              onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
              placeholder="Répétez le mot de passe"
              className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Votre essai gratuit de {summaryTrialLabel} commence dès maintenant. Aucun prélèvement avant le {firstChargeDate.toLocaleDateString('fr-FR')}.
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setAccountError('');
              setStep('plan-selection');
            }}
            className="w-full md:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
          >
            ← Retour aux formules
          </button>
          <button
            type="submit"
            disabled={creatingAccount}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-teal-600 transition shadow-lg hover:shadow-xl disabled:opacity-60"
          >
            {creatingAccount ? 'Création du compte...' : 'Créer mon compte et continuer'}
          </button>
        </div>
      </form>
      <p className="mt-6 text-xs text-gray-500 text-center">
        En créant votre compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </p>
    </div>
  );

  const paymentStep = (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {accountCreated && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm font-semibold">
              Votre compte parent est prêt. Il ne reste plus qu'à confirmer votre essai gratuit.
            </div>
          )}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Résumé de votre essai</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <div className="flex items-center justify-between">
                <span>Formule sélectionnée</span>
                <span className="font-semibold">{selectedPlan.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Période de facturation</span>
                <span className="font-semibold">{billingPeriod === 'monthly' ? 'Mensuelle' : 'Annuelle'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Prix par {billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                <span className="font-semibold">{price.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Enfants inclus</span>
                <span className="font-semibold">{selectedChildren === 5 ? '5 ou plus' : `${selectedChildren}`} enfants</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3">
            <h4 className="text-lg font-semibold text-blue-900">Informations sur la facturation</h4>
            <p className="text-sm text-blue-800">
              Aujourd'hui, vous payez <span className="font-bold">0,00 €</span>.
            </p>
            <p className="text-sm text-blue-800">
              Après votre essai gratuit de{' '}
              <span className="font-bold">{summaryTrialLabel}</span>, si vous n'annulez pas votre essai, le montant de{' '}
              <span className="font-bold">{price.toFixed(2)} €</span> sera prélevé automatiquement.
            </p>
            <p className="text-xs text-blue-700">
              Prochain prélèvement estimé le {firstChargeDate.toLocaleDateString('fr-FR')} (à la fin de votre essai gratuit de {summaryTrialLabel}).
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Code promo (optionnel)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromoValidation(null);
                  }}
                  onBlur={promoCode ? validatePromoCode : undefined}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none uppercase"
                  placeholder="CODE2025"
                />
              </div>
              <button
                onClick={validatePromoCode}
                disabled={validatingPromo || !promoCode}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition disabled:opacity-50"
              >
                {validatingPromo ? 'Vérification...' : 'Appliquer'}
              </button>
            </div>
            {promoValidation && (
              <p className={`text-sm mt-2 ${promoValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                {promoValidation.valid
                  ? promoValidation.message || `Code appliqué ! Votre essai total dure ${formattedTotalTrial}.`
                  : promoValidation.message || 'Code invalide'}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Prêt à démarrer ?</h3>
            <p className="text-sm text-white/80 mb-6">
              Ajoutez votre moyen de paiement sécurisé pour confirmer l'essai gratuit.
            </p>
            <div className="bg-white/10 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Montant aujourd'hui</span>
                <span className="font-semibold">0,00 €</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Après l'essai</span>
                <span className="font-semibold">{price.toFixed(2)} €/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Essai gratuit total</span>
                <span className="font-semibold">{summaryTrialLabel}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-300/60 text-sm text-white rounded-lg px-4 py-3 mb-6">
                {error}
              </div>
            )}

            {finalizingCheckout && (
              <div className="bg-white/20 border border-white/40 text-sm text-white rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Validation de votre paiement en cours...
              </div>
            )}

            <button
              onClick={handleStartPayment}
              disabled={processingCheckout || finalizingCheckout}
              className="w-full py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {processingCheckout ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-purple-600 border-t-transparent"></div>
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  Ajouter ma carte et activer l'essai
                  <ArrowRight size={24} />
                </>
              )}
            </button>
            <button
              onClick={() => {
                setStep('plan-selection');
                setError('');
              }}
              className="w-full mt-3 py-3 bg-transparent text-white font-semibold rounded-xl border border-white/30 hover:bg-white/10 transition"
            >
              Modifier ma formule
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const confirmationStep = (
    <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h3 className="text-4xl font-bold text-gray-900 mb-4">Paiement confirmé !</h3>
      <p className="text-lg text-gray-600 mb-6">
        Merci pour votre confiance. Votre essai gratuit de{' '}
        <span className="font-semibold text-green-600">{summaryTrialLabel}</span> est activé.
      </p>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 max-w-xl mx-auto text-left">
        <h4 className="text-xl font-semibold text-gray-800 mb-4">Récapitulatif</h4>
        <div className="space-y-2 text-gray-700 text-sm">
          <div className="flex items-center justify-between">
            <span>Formule</span>
            <span className="font-semibold">{selectedPlan.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Enfants inclus</span>
            <span className="font-semibold">{selectedChildren === 5 ? '5 ou plus' : `${selectedChildren}`} enfants</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Période</span>
            <span className="font-semibold">{billingPeriod === 'monthly' ? 'Mensuelle' : 'Annuelle'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Prix après l'essai</span>
            <span className="font-semibold">{price.toFixed(2)} €/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Prochain prélèvement</span>
            <span className="font-semibold">{firstChargeDate.toLocaleDateString('fr-FR')}</span>
          </div>
          {promoValidation?.valid && (
            <div className="flex items-center justify-between">
              <span>Code promo</span>
              <span className="font-semibold text-green-600">{promoCode}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-8">Nous sommes prêts à accueillir vos enfants !</p>
      <button
        onClick={onComplete}
        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-3 mx-auto"
      >
        Commencer l'onboarding d'ajout d'enfants
        <ArrowRight size={24} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {onCancel && (
          <div className="mb-6">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-5 py-2 bg-white text-gray-700 font-semibold rounded-xl shadow hover:shadow-md border border-gray-200 hover:bg-gray-50 transition"
            >
              ← Retour
            </button>
          </div>
        )}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
              PioPi
            </h1>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            {step === 'plan-selection' && 'Choisissez votre abonnement'}
            {step === 'account' && 'Créez votre compte'}
            {step === 'payment' && 'Phase de paiement'}
            {step === 'confirmation' && 'Merci pour votre confiance !'}
          </h2>
          <p className="text-xl text-gray-600 mb-2">
            Commencez avec <span className="font-bold text-green-600">{trialHeadline}</span>
          </p>
          {activeDescription && <p className="text-base text-gray-500 mb-1">{activeDescription}</p>}
          <p className="text-base text-gray-500">Annulez à tout moment sans engagement • Aucun paiement pendant l'essai</p>
        </div>

        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between gap-4">
            {stepOrder.map((flowStep, index) => (
              <div key={flowStep} className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    index <= currentStepIndex
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStepIndex ? <Check size={24} /> : index + 1}
                </div>
                {index < stepOrder.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded-full ${
                      index < currentStepIndex
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                        : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {step === 'plan-selection' && planStep}
        {step === 'account' && accountStep}
        {step === 'payment' && paymentStep}
        {step === 'confirmation' && confirmationStep}

        <div className="text-center space-y-4 mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-sm text-yellow-800 font-semibold mb-2">Rappel important :</p>
            <ul className="text-sm text-yellow-700 space-y-1 text-left">
              <li>✓ Ajoutez dès maintenant votre moyen de paiement sécurisé</li>
              <li>✓ Annulation possible à tout moment pendant l'essai</li>
              <li>✓ Suivi personnalisé pour chaque enfant</li>
            </ul>
          </div>
          <p className="text-base font-semibold text-gray-700">Vous avez des questions ? Contactez-nous à support@piopi.eu</p>
        </div>
      </div>
    </div>
  );
}
