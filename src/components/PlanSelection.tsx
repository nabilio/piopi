import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ArrowRight, Users, Tag, Info, Sparkles, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTrialConfig, formatTrialDuration } from '../hooks/useTrialConfig';

type PricingPlan = {
  children: number;
  monthlyPrice: number;
  yearlyPrice: number;
};

const PRICING_PLANS: PricingPlan[] = [
  { children: 1, monthlyPrice: 2.00, yearlyPrice: 20.00 },
  { children: 2, monthlyPrice: 3.00, yearlyPrice: 30.00 },
  { children: 3, monthlyPrice: 5.00, yearlyPrice: 50.00 },
  { children: 4, monthlyPrice: 6.00, yearlyPrice: 60.00 },
  { children: 5, monthlyPrice: 8.00, yearlyPrice: 80.00 },
];

type PlanSelectionProps = {
  onComplete?: () => void;
  initialStep?: FlowStep;
  initialPlanId?: PlanId;
  onBack?: () => void;
};

export function PlanSelection({ onComplete }: PlanSelectionProps) {
  const [selectedChildren, setSelectedChildren] = useState(1);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoValidation, setPromoValidation] = useState<{ valid: boolean; message?: string; free_months?: number } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [step, setStep] = useState<FlowStep>('plan-selection');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [finalizingCheckout, setFinalizingCheckout] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const isMountedRef = useRef(true);
  const hasHandledCheckoutRef = useRef(false);
  const {
    baseTrialDays,
    formattedBaseTrial,
    promoHeadline: trialHeadline,
    activeDescription,
    loading: trialConfigLoading,
  } = useTrialConfig();

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

  useEffect(() => {
    if (!initialPlanId) {
      return;
    }

    const matchingPlan = PRICING_PLANS.find((plan) => plan.id === initialPlanId);
    if (matchingPlan) {
      setSelectedChildren(matchingPlan.children);
    }
  }, [initialPlanId]);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

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
        promo_code_input: promoCode
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

  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function finalizeCheckout(pending: PendingCheckoutPayload, sessionId: string) {
    setError('');

    try {
      const verification = await verifyStripeCheckout(sessionId);
      if (verification.status !== 'complete' || verification.paymentStatus !== 'paid') {
        throw new Error('Le paiement n’a pas été validé.');
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
    },
    [onComplete],
  );

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

      localStorage.removeItem(PENDING_CHECKOUT_KEY);
      if (isMountedRef.current) {
        setStep('confirmation');
        const complete = onCompleteRef.current;
        if (typeof complete === 'function') {
          complete();
        }
      }
    } catch (error: unknown) {
      console.error('Subscription finalization error:', error);
      const message = error instanceof Error ? error.message : "Erreur lors de la finalisation de l'abonnement";
      if (isMountedRef.current) {
        setError(message);
      }
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
      hasHandledCheckoutRef.current = false;
    }
  }

  useEffect(() => {
    if (trialConfigLoading || hasHandledCheckoutRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout_status');
    const provider = params.get('provider');
    const sessionId = params.get('session_id');

    if (!checkoutStatus) {
      return;
    }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const pending = JSON.parse(pendingRaw) as PendingCheckoutPayload;
          const matchingPlan = PRICING_PLANS.find((plan) => plan.id === pending.planId);
          if (matchingPlan) {
            setSelectedChildren(matchingPlan.children);
          }
          setStep('payment');
          setFinalizingCheckout(true);
          hasHandledCheckoutRef.current = true;
          finalizeCheckout(pending, sessionId)
            .catch(() => {
              // finalizeCheckout already handles error state
            })
            .finally(() => {
              if (isMountedRef.current) {
                setFinalizingCheckout(false);
              }
            });
        } catch (parseError) {
          console.error('Failed to parse pending checkout payload:', parseError);
          setError('Une erreur est survenue lors de la récupération du paiement.');
          localStorage.removeItem(PENDING_CHECKOUT_KEY);
          hasHandledCheckoutRef.current = false;
        }
      }
    } else if (checkoutStatus === 'cancel') {
      setStep('payment');
      setError('Paiement annulé. Vous pouvez réessayer.');
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
      hasHandledCheckoutRef.current = true;
    }

    params.delete('checkout_status');
    params.delete('provider');
    params.delete('session_id');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [trialConfigLoading]);

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

      onComplete();
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Erreur lors de la création de l\'abonnement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {onBack && (
          <div className="mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold transition"
            >
              <ArrowLeft size={22} />
              Retour à l'accueil
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
            Choisissez votre abonnement
          </h2>
          <p className="text-xl text-gray-600 mb-2">
            Commencez avec <span className="font-bold text-green-600">{trialHeadline}</span>
          </p>
          {activeDescription && (
            <p className="text-base text-gray-500 mb-1">{activeDescription}</p>
          )}
          <p className="text-base text-gray-500">
            Annulez à tout moment sans engagement • Aucun paiement pendant l'essai
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {/* Période de facturation */}
          <div className="mb-10">
            <h3 className="text-center text-xl font-bold text-gray-800 mb-4">
              Choisissez votre période de facturation
            </h3>
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

          {/* Nombre d'enfants */}
          <div className="mb-10">
            <h3 className="text-center text-xl font-bold text-gray-800 mb-4">
              Combien d'enfants souhaitez-vous inscrire ?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {PRICING_PLANS.map(plan => {
                const planPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                const perChild = planPrice / plan.children;
                const isSelected = selectedChildren === plan.children;
                return (
                  <button
                    key={plan.children}
                    onClick={() => setSelectedChildren(plan.children)}
                    className={`p-6 rounded-2xl border-3 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <Users className={isSelected ? 'text-blue-500' : 'text-gray-400'} size={32} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {plan.children}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {plan.children === 1 ? 'enfant' : 'enfants'}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {planPrice.toFixed(2)}€
                    </div>
                    <div className="text-xs text-gray-500">
                      /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {perChild.toFixed(2)}€ par enfant
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-blue-800">
                  Vous pourrez ajouter ou retirer des profils d'enfants à tout moment depuis vos paramètres.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 mb-6"></div>

          {/* Récapitulatif */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg mb-6">
                <Sparkles size={20} />
                Essai gratuit de {summaryTrialLabel}
              </div>
              <div className="text-6xl font-black text-gray-900 mb-3">
                0,00 €
                <span className="text-2xl text-gray-600 font-normal ml-2">
                  aujourd'hui
                </span>
              </div>
              <div className="bg-white rounded-xl p-6 max-w-md mx-auto mb-4">
                <div className="text-lg text-gray-700 mb-2">
                  Après votre essai gratuit :
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {price.toFixed(2)} €<span className="text-xl text-gray-600">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Pour {selectedChildren} {selectedChildren === 1 ? 'enfant' : 'enfants'}</div>
                  <div className="font-semibold text-blue-600">
                    Soit {pricePerChild.toFixed(2)}€ par enfant par {billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </div>
                </div>
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

            <div className="space-y-3 text-left max-w-2xl mx-auto">
              <div className="text-lg font-bold text-gray-800 mb-4">
                Ce qui est inclus :
              </div>
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

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Code promo (optionnel)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoValidation(null);
                  }}
                  onBlur={validatePromoCode}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none uppercase"
                  placeholder="CODE2025"
                />
              </div>
              <button
                onClick={validatePromoCode}
                disabled={validatingPromo || !promoCode}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition disabled:opacity-50"
              >
                {validatingPromo ? 'Vérification...' : 'Valider'}
              </button>
            </div>
            {promoValidation && (
              <p className={`text-sm mt-2 ${promoValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                {promoValidation.message}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-xl rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                Création de votre abonnement...
              </>
            ) : (
              <>
                Commencer mon essai gratuit
                <ArrowRight size={24} />
              </>
            )}
          </button>
        </div>

        {step === 'plan-selection' && planStep}
        {step === 'payment' && paymentStep}
        {step === 'confirmation' && confirmationStep}

        {step === 'plan-selection' && planStep}
        {step === 'payment' && paymentStep}
        {step === 'confirmation' && confirmationStep}

        <div className="text-center space-y-4 mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              Rappel important :
            </p>
            <ul className="text-sm text-yellow-700 space-y-1 text-left">
              <li>✓ Aucune carte bancaire demandée</li>
              <li>✓ 30 jours d'essai entièrement gratuit</li>
              <li>✓ Annulation possible à tout moment</li>
              <li>✓ Premier prélèvement seulement après la fin de l'essai</li>
            </ul>
          </div>
          <p className="text-base font-semibold text-gray-700">
            Vous avez des questions ? Contactez-nous à support@piopi.eu
          </p>
        </div>
      </div>
    </div>
  );
}
