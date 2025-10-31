import { useEffect, useMemo, useState } from 'react';
import { Check, ArrowRight, Mail, Lock, User, Tag, CreditCard, ShieldCheck, X, Sparkles, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTrialConfig, formatTrialDuration } from '../hooks/useTrialConfig';
import { createStripeCheckout, verifyStripeCheckout, type PlanId } from '../utils/payment';

type PricingPlan = {
  planId: PlanId;
  name: string;
  children: number;
  childrenLabel: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  highlight?: string;
  features: string[];
};

const PRICING_PLANS: PricingPlan[] = [
  {
    planId: 'basic',
    name: 'Basique',
    children: 1,
    childrenLabel: '1 enfant',
    monthlyPrice: 2.0,
    yearlyPrice: 20.0,
    features: [
      'Tous les cours et exercices',
      'Suivi de progression',
      'Mode bataille',
      'Réseau social sécurisé',
    ],
  },
  {
    planId: 'duo',
    name: 'Duo',
    children: 2,
    childrenLabel: "Jusqu'à 2 enfants",
    monthlyPrice: 3.0,
    yearlyPrice: 30.0,
    badge: 'Populaire',
    highlight: '1,50€ par enfant',
    features: [
      'Tous les cours et exercices',
      'Suivi détaillé',
      'Mode bataille',
      'Réseau social sécurisé',
    ],
  },
  {
    planId: 'family',
    name: 'Famille',
    children: 3,
    childrenLabel: "Jusqu'à 3 enfants",
    monthlyPrice: 5.0,
    yearlyPrice: 50.0,
    highlight: '1,67€ par enfant',
    features: [
      'Tous les cours et exercices',
      'Suivi avancé',
      'Mode bataille',
      'Réseau social sécurisé',
    ],
  },
  {
    planId: 'premium',
    name: 'Premium',
    children: 4,
    childrenLabel: "Jusqu'à 4 enfants",
    monthlyPrice: 6.0,
    yearlyPrice: 60.0,
    badge: 'Meilleure offre',
    highlight: 'Support prioritaire inclus',
    features: [
      'Tous les cours et exercices',
      'Suivi de progression avancé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Support prioritaire',
    ],
  },
  {
    planId: 'liberte',
    name: 'Liberté',
    children: 5,
    childrenLabel: "Jusqu'à 5 enfants",
    monthlyPrice: 8.0,
    yearlyPrice: 80.0,
    highlight: '+2€ par enfant supplémentaire',
    features: [
      "Jusqu'à 5 enfants inclus",
      'Ajoutez des enfants supplémentaires à tout moment (+2€/enfant)',
      'Tous les cours et exercices',
      'Suivi de progression avancé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Support prioritaire VIP',
    ],
  },
];

type RegistrationPageProps = {
  onSuccess: () => void;
  onCancel: () => void;
  initialPlanId?: PlanId | null;
};

type PendingRegistrationPayment = {
  sessionId?: string;
  planId: PlanId;
  children: number;
  email: string;
  fullName: string;
  billingPeriod: 'monthly' | 'yearly';
};

export const PENDING_REGISTRATION_STORAGE_KEY = 'pendingRegistrationPayment';
const LAST_COMPLETED_REGISTRATION_KEY = 'lastCompletedRegistrationPlan';

type CompletedRegistrationPlan = {
  planId: PlanId;
  children: number;
  billingPeriod: 'monthly' | 'yearly';
};

function cacheCompletedRegistration(plan: CompletedRegistrationPlan) {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(LAST_COMPLETED_REGISTRATION_KEY, JSON.stringify(plan));
  } catch (storageError) {
    console.error('Failed to cache completed registration plan:', storageError);
  }
}

export function RegistrationPage({ onSuccess, onCancel, initialPlanId }: RegistrationPageProps) {
  const { user, profile, signIn, signInWithGoogle, signOut } = useAuth();
  const [step, setStep] = useState<'plan' | 'details' | 'payment'>('plan');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlanId ?? 'basic');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    promoCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoValidation, setPromoValidation] = useState<{ valid: boolean; message?: string; free_months?: number } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [finalizingPayment, setFinalizingPayment] = useState(false);
  const [planStatusMessage, setPlanStatusMessage] = useState('');
  const [hasCompletedAccountCreation, setHasCompletedAccountCreation] = useState(() => {
    const pending = getPendingRegistration();
    return Boolean(pending);
  });
  const [signingOut, setSigningOut] = useState(false);
  const { baseTrialDays, formattedBaseTrial, promoBanner } = useTrialConfig();

  const selectedPlan = useMemo(
    () => PRICING_PLANS.find((plan) => plan.planId === selectedPlanId) ?? PRICING_PLANS[0],
    [selectedPlanId]
  );
  const selectedChildren = selectedPlan.children;
  const price = billingPeriod === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

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
  const pricePerChild = price / selectedChildren;
  const isAuthenticated = Boolean(user);
  const isGoogleSignIn = user?.app_metadata?.provider === 'google';
  const shouldSkipDetails = isAuthenticated && isGoogleSignIn;

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => {
      const trimmedProfileName = profile?.full_name?.trim();
      const metadataFullName = typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : '';
      const metadataName = typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name.trim()
        : '';

      const resolvedFullName = trimmedProfileName && trimmedProfileName.length > 0
        ? trimmedProfileName
        : metadataFullName || metadataName || prev.fullName;

      return {
        ...prev,
        email: user.email ?? prev.email,
        fullName: resolvedFullName,
      };
    });
  }, [user, profile]);

  useEffect(() => {
    if (!initialPlanId) return;
    const plan = PRICING_PLANS.find((p) => p.planId === initialPlanId);
    if (plan) {
      setSelectedPlanId(plan.planId);
      if (step === 'plan') {
        setStep(shouldSkipDetails || hasCompletedAccountCreation ? 'payment' : 'details');
      }
    }
  }, [initialPlanId, shouldSkipDetails, hasCompletedAccountCreation, step]);

  useEffect(() => {
    if ((shouldSkipDetails || hasCompletedAccountCreation) && step === 'details') {
      setStep('payment');
    }
  }, [shouldSkipDetails, hasCompletedAccountCreation, step]);

  function handlePlanSelection(plan: PricingPlan) {
    setSelectedPlanId(plan.planId);
    setPlanStatusMessage('');
    if (shouldSkipDetails || hasCompletedAccountCreation) {
      setStep('payment');
    } else {
      setStep('details');
    }
  }

  async function validatePromoCode() {
    if (!formData.promoCode) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        promo_code_input: formData.promoCode
      });

      if (error) throw error;

      setPromoValidation(data);
    } catch (err: unknown) {
      console.error('Promo code validation error:', err);
      setPromoValidation({ valid: false, message: 'Erreur lors de la validation du code' });
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const promoMonths = promoValidation?.valid ? (promoValidation.free_months || 0) : 0;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-parent`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          selectedChildren,
          planId: selectedPlan.planId,
          billingPeriod,
          price,
          promoCode: formData.promoCode || null,
          promoMonths,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      await signIn(formData.email, formData.password);

      const pending: PendingRegistrationPayment = {
        planId: selectedPlan.planId,
        children: selectedChildren,
        email: formData.email,
        fullName: formData.fullName,
        billingPeriod,
      };

      localStorage.setItem(PENDING_REGISTRATION_STORAGE_KEY, JSON.stringify(pending));
      setPaymentError('');
      setPlanStatusMessage('');
      setHasCompletedAccountCreation(true);
      setStep('payment');
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'inscription';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function getPendingRegistration(): PendingRegistrationPayment | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(PENDING_REGISTRATION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingRegistrationPayment;
    } catch (parseError) {
      console.error('Failed to parse pending registration data:', parseError);
      localStorage.removeItem(PENDING_REGISTRATION_STORAGE_KEY);
      return null;
    }
  }

  async function sendWelcomeEmail(pending: PendingRegistrationPayment) {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pending.email,
          subject: 'Bienvenue sur PioPi 🎉',
          template: 'welcome',
          data: {
            parentName: pending.fullName,
          },
        }),
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
  }

  async function finalizeStripePayment(sessionId: string, pending: PendingRegistrationPayment) {
    setFinalizingPayment(true);
    setPaymentError('');

    try {
      const verification = await verifyStripeCheckout(sessionId);

      if (!verification.paymentStatus || !['paid', 'no_payment_required'].includes(verification.paymentStatus)) {
        throw new Error('Le paiement n\'a pas pu être confirmé.');
      }

      await sendWelcomeEmail(pending);
      cacheCompletedRegistration({
        planId: pending.planId,
        children: pending.children,
        billingPeriod: pending.billingPeriod,
      });

      localStorage.removeItem(PENDING_REGISTRATION_STORAGE_KEY);
      onSuccess();
    } catch (err: unknown) {
      console.error('Erreur lors de la validation du paiement:', err);
      const message = err instanceof Error ? err.message : 'Impossible de valider le paiement.';
      setPaymentError(message);
    } finally {
      setFinalizingPayment(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const registrationStatus = params.get('registration_payment');

    if (!registrationStatus) {
      return;
    }

    const pending = getPendingRegistration();
    setStep('payment');

    if (registrationStatus === 'success') {
      const sessionId = params.get('session_id');
      if (sessionId && pending) {
        finalizeStripePayment(sessionId, pending);
      } else {
        setPaymentError('Impossible de retrouver la session de paiement.');
      }
    } else if (registrationStatus === 'cancel') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_REGISTRATION_STORAGE_KEY);
      }
      setHasCompletedAccountCreation(true);
      setPaymentError('');
      setPlanStatusMessage('Le paiement a été annulé. Vous pouvez choisir un plan avant de réessayer.');
      setPaymentLoading(false);
      setFinalizingPayment(false);
      setStep('plan');
    }

    params.delete('registration_payment');
    params.delete('session_id');
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    window.history.replaceState({}, document.title, newUrl);
  }, []);

  useEffect(() => {
    const pending = getPendingRegistration();
    if (pending) {
      setHasCompletedAccountCreation(true);
      setSelectedPlanId(pending.planId);
      setBillingPeriod(pending.billingPeriod);
      if (step !== 'payment') {
        setStep('payment');
      }
    }
  }, [step]);

  async function handleStartPayment() {
    setPaymentError('');
    setPlanStatusMessage('');
    setPaymentLoading(true);

    try {
      const pending = getPendingRegistration();
      if (!pending) {
        const basePending: PendingRegistrationPayment = {
          planId: selectedPlan.planId,
          children: selectedChildren,
          email: formData.email,
          fullName: formData.fullName,
          billingPeriod,
        };
        localStorage.setItem(PENDING_REGISTRATION_STORAGE_KEY, JSON.stringify(basePending));
      }

      const successUrl = `${window.location.origin}/?registration_payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/?registration_payment=cancel`;

      const response = await createStripeCheckout({
        planId: selectedPlan.planId,
        childrenCount: selectedChildren,
        successUrl,
        cancelUrl,
      });

      const pendingData: PendingRegistrationPayment = {
        planId: selectedPlan.planId,
        children: selectedChildren,
        email: formData.email,
        fullName: formData.fullName,
        billingPeriod,
        sessionId: response.sessionId,
      };
      localStorage.setItem(PENDING_REGISTRATION_STORAGE_KEY, JSON.stringify(pendingData));

      window.location.href = response.url;
    } catch (err: unknown) {
      console.error('Erreur lors de la création du paiement:', err);
      const message = err instanceof Error ? err.message : 'Impossible de lancer le paiement.';
      setPaymentError(message);
    } finally {
      setPaymentLoading(false);
    }
  }

  function handleReturnToPlans() {
    const pending = getPendingRegistration();
    if (pending) {
      setSelectedPlanId(pending.planId);
      setBillingPeriod(pending.billingPeriod);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PENDING_REGISTRATION_STORAGE_KEY);
    }
    setPaymentError('');
    setPlanStatusMessage("Vous pouvez à nouveau choisir un plan avant de procéder au paiement.");
    setPaymentLoading(false);
    setFinalizingPayment(false);
    setStep('plan');
    setHasCompletedAccountCreation(true);
  }

  function clearPendingRegistrationState() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PENDING_REGISTRATION_STORAGE_KEY);
    }
    setHasCompletedAccountCreation(false);
  }

  function resetPaymentUiState() {
    setPaymentError('');
    setPlanStatusMessage('');
    setPaymentLoading(false);
    setFinalizingPayment(false);
  }

  function handleReturnHome() {
    resetPaymentUiState();
    if (step === 'payment') {
      handleReturnToPlans();
      return;
    }
    clearPendingRegistrationState();
    onCancel();
  }

  function handleExitRegistration() {
    resetPaymentUiState();
    clearPendingRegistrationState();
    setStep('plan');
    onCancel();
  }

  async function handleSignOutAndExit() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      clearPendingRegistrationState();
      await signOut();
      resetPaymentUiState();
      setStep('plan');
      onCancel();
    } catch (err) {
      console.error('Failed to sign out during registration:', err);
      alert(err instanceof Error ? err.message : 'Impossible de se déconnecter. Veuillez réessayer.');
    } finally {
      setSigningOut(false);
    }
  }

  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleReturnHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                <Home size={20} />
                Retour à l'accueil
              </button>
              <button
                onClick={handleExitRegistration}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                Annuler l'inscription
              </button>
            </div>
            {user && (
              <button
                onClick={handleSignOutAndExit}
                disabled={signingOut}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline disabled:opacity-60"
              >
                <LogOut size={18} />
                {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            )}
          </div>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Commencez votre aventure d'apprentissage
            </h1>
            <p className="text-xl text-gray-600">
              {promoBanner}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            {planStatusMessage && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 text-blue-800 rounded-xl">
                {planStatusMessage}
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mb-10">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-xl font-semibold transition ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-xl font-semibold transition relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annuel
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  -17%
                </span>
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {PRICING_PLANS.map((plan) => {
                const priceForPeriod = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                const perChild = priceForPeriod / plan.children;
                const isSelected = plan.planId === selectedPlanId;

                return (
                  <div
                    key={plan.planId}
                    onClick={() => setSelectedPlanId(plan.planId)}
                    className={`relative rounded-2xl border-2 p-6 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 shadow-xl scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                        {plan.badge}
                      </div>
                    )}
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-black text-gray-800 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className={`text-4xl font-black ${isSelected ? 'text-blue-600' : 'text-gray-800'}`}>
                          {priceForPeriod.toFixed(2)}€
                        </span>
                        <span className="text-gray-600">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                      </div>
                      <p className="text-sm text-gray-600">{plan.childrenLabel}</p>
                      {plan.highlight && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                          <p className="text-xs text-green-700 font-semibold">{plan.highlight}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-3">
                        Soit {perChild.toFixed(2)}€ par enfant par {billingPeriod === 'monthly' ? 'mois' : 'an'}
                      </p>
                    </div>
                    <ul className="space-y-3 mb-6 text-sm text-gray-700">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePlanSelection(plan);
                      }}
                      className={`w-full py-3 rounded-xl font-bold transition ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:from-blue-600 hover:to-purple-600'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {shouldSkipDetails ? 'Choisir et passer au paiement' : 'Choisir ce plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg mb-4">
                  <Sparkles size={20} />
                  Essai gratuit de {summaryTrialLabel}
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  0,00 €
                  <span className="text-2xl text-gray-600 font-normal ml-2">aujourd'hui</span>
                </div>
                <p className="text-sm text-gray-600">
                  Premier prélèvement le {firstChargeDate.toLocaleDateString('fr-FR')}
                </p>
                {promoValidation?.valid && (
                  <p className="text-xs text-green-700 mt-1">
                    Code promo appliqué : votre essai total dure {formattedTotalTrial}.
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div>
                  <p className="text-lg font-bold text-gray-800 mb-2">Plan sélectionné</p>
                  <p className="text-xl text-gray-700 font-semibold">
                    {selectedPlan.name} • {selectedPlan.childrenLabel}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {price.toFixed(2)} €<span className="text-xl text-gray-600">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Soit {pricePerChild.toFixed(2)} € par enfant par {billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800 mb-2">Ce qui est inclus</p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Check className="text-white" size={16} />
                      </div>
                      <span>Accès complet au programme scolaire français</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Check className="text-white" size={16} />
                      </div>
                      <span>Leçons interactives et quiz personnalisés</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Check className="text-white" size={16} />
                      </div>
                      <span>Suivi des progrès en temps réel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-green-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Check className="text-white" size={16} />
                      </div>
                      <span>Réseau social sécurisé pour vos enfants</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePlanSelection(selectedPlan)}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-2 text-lg"
            >
              {shouldSkipDetails ? 'Passer au paiement sécurisé' : `Continuer avec le plan ${selectedPlan.name}`}
              <ArrowRight size={20} />
            </button>

            {!isAuthenticated && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">ou</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      await signInWithGoogle();
                    } catch (err: unknown) {
                      console.error('Google sign in error:', err);
                      alert(err instanceof Error ? err.message : 'Erreur lors de la connexion avec Google');
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                  disabled={googleLoading}
                  className="w-full py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
                </button>
              </>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Résiliez à tout moment. Sans engagement.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    const pending = getPendingRegistration();
    const planDetails = pending
      ? PRICING_PLANS.find((plan) => plan.planId === pending.planId) ?? selectedPlan
      : selectedPlan;
    const childrenCount = pending?.children ?? selectedChildren;
    const currentBillingPeriod = pending?.billingPeriod ?? billingPeriod;
    const displayPrice = currentBillingPeriod === 'monthly' ? planDetails.monthlyPrice : planDetails.yearlyPrice;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleReturnHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                <Home size={20} />
                Retour à l'accueil
              </button>
              <button
                onClick={handleReturnToPlans}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                <X size={20} />
                Retourner au choix des plans
              </button>
              <button
                onClick={handleExitRegistration}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
              >
                Annuler l'inscription
              </button>
            </div>
            {user && (
              <button
                onClick={handleSignOutAndExit}
                disabled={signingOut}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline disabled:opacity-60"
              >
                <LogOut size={18} />
                {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Finalisez votre inscription</h2>
              <p className="text-gray-600">
                Validez votre essai gratuit pour {childrenCount} {childrenCount > 1 ? 'enfants' : 'enfant'}.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plan sélectionné</p>
                  <p className="text-xl font-bold text-gray-900">{planDetails.name}</p>
                  <p className="text-sm text-gray-600">{planDetails.childrenLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Après l'essai</p>
                  <p className="text-2xl font-bold text-gray-900">{displayPrice.toFixed(2)} €/{currentBillingPeriod === 'monthly' ? 'mois' : 'an'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm text-blue-800">
                <ShieldCheck size={18} />
                Essai gratuit de {summaryTrialLabel} sans engagement
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                {paymentError}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <CreditCard className="text-blue-500" size={28} />
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-semibold">Paiement sécurisé par Stripe</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Montant prélevé : 0 € aujourd'hui (essai gratuit)</li>
                    <li>Vous pourrez annuler votre essai à tout moment</li>
                    <li>Premier prélèvement automatique le {firstChargeDate.toLocaleDateString('fr-FR')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleReturnToPlans}
              disabled={paymentLoading || finalizingPayment}
              className="w-full mb-4 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition disabled:opacity-50"
            >
              Revenir au choix des plans
            </button>

            <button
              onClick={handleStartPayment}
              disabled={paymentLoading || finalizingPayment}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {paymentLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent" />
                  Redirection vers le paiement sécurisé...
                </>
              ) : finalizingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent" />
                  Validation du paiement...
                </>
              ) : (
                <>
                  Procéder au paiement sécurisé
                  <ArrowRight size={22} />
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              En validant, vous acceptez nos conditions générales d'utilisation. Vous serez redirigé vers Stripe pour enregistrer votre moyen de paiement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReturnHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold"
            >
              <Home size={20} />
              Retour à l'accueil
            </button>
            <button
              onClick={handleExitRegistration}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              Annuler l'inscription
            </button>
          </div>
          {user && (
            <button
              onClick={handleSignOutAndExit}
              disabled={signingOut}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline disabled:opacity-60"
            >
              <LogOut size={18} />
              {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Créez votre compte</h2>
            <p className="text-gray-600">
              Plan {selectedPlan.name} • {selectedPlan.childrenLabel} - {price.toFixed(2)} €/{billingPeriod === 'monthly' ? 'mois' : 'an'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Soit {pricePerChild.toFixed(2)} € par enfant par {billingPeriod === 'monthly' ? 'mois' : 'an'}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Essai gratuit de {summaryTrialLabel} • Premier prélèvement le {firstChargeDate.toLocaleDateString('fr-FR')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="inline mr-2" size={16} />
                Nom complet
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="inline mr-2" size={16} />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ces informations seront utilisées pour sécuriser votre compte.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="inline mr-2" size={16} />
                Mot de passe
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="inline mr-2" size={16} />
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Tag className="inline mr-2" size={16} />
                Code promo (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.promoCode}
                  onChange={(e) => {
                    setFormData({ ...formData, promoCode: e.target.value.toUpperCase() });
                    setPromoValidation(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none uppercase"
                  placeholder="RENTREE2025"
                />
                <button
                  type="button"
                  onClick={validatePromoCode}
                  disabled={!formData.promoCode || validatingPromo}
                  className="px-4 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingPromo ? '...' : 'Vérifier'}
                </button>
              </div>
              {promoValidation && (
                <div className={`mt-2 p-3 rounded-lg ${promoValidation.valid ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <p className={`text-sm font-semibold ${promoValidation.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {promoValidation.valid
                      ? `Code valide ! ${promoValidation.free_months} mois gratuits supplémentaires`
                      : promoValidation.message || 'Code invalide'}
                  </p>
                  {promoValidation.valid && (
                    <p className="text-xs text-green-700 mt-1">
                      Essai total: {formattedTotalTrial}.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 text-lg"
            >
              {loading ? 'Inscription en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <button
            onClick={() => setStep('plan')}
            className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800 font-semibold transition"
          >
            Retour au choix de l'abonnement
          </button>
        </div>
      </div>
    </div>
  );
}
