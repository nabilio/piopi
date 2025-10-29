import { useMemo, useState } from 'react';
import { Check, ArrowRight, Users, Tag, Info, Sparkles, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTrialConfig, formatTrialDuration } from '../hooks/useTrialConfig';

type PricingPlan = {
  children: number;
  monthlyPrice: number;
  yearlyPrice: number;
};

const PRICING_PLANS: PricingPlan[] = [
  { children: 1, monthlyPrice: 2.0, yearlyPrice: 20.0 },
  { children: 2, monthlyPrice: 3.0, yearlyPrice: 30.0 },
  { children: 3, monthlyPrice: 5.0, yearlyPrice: 50.0 },
  { children: 4, monthlyPrice: 6.0, yearlyPrice: 60.0 },
  { children: 5, monthlyPrice: 8.0, yearlyPrice: 80.0 },
];

type PlanSelectionProps = {
  onComplete: () => void;
};

type FlowStep = 'plan-selection' | 'payment' | 'confirmation';

const STEP_ORDER: FlowStep[] = ['plan-selection', 'payment', 'confirmation'];

export function PlanSelection({ onComplete }: PlanSelectionProps) {
  const [selectedChildren, setSelectedChildren] = useState(1);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoValidation, setPromoValidation] = useState<{ valid: boolean; message?: string; free_months?: number } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [step, setStep] = useState<FlowStep>('plan-selection');
  const { baseTrialDays, formattedBaseTrial, promoHeadline: trialHeadline, activeDescription } = useTrialConfig();

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
    } catch (err) {
      setPromoValidation({ valid: false, message: 'Erreur lors de la validation du code' });
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handleConfirmSubscription() {
    setError('');
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const promoMonths = promoValidation?.valid ? promoValidation.free_months || 0 : 0;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: billingPeriod,
          children_count: selectedChildren,
          price,
          status: 'trial',
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          promo_code: promoValidation?.valid ? promoCode.trim().toUpperCase() : null,
          promo_months_remaining: promoMonths,
        });

      if (subscriptionError) throw subscriptionError;

      await supabase.from('subscription_history').insert({
        user_id: user.id,
        children_count: selectedChildren,
        price,
        plan_type: billingPeriod,
        action_type: 'trial_started',
        notes:
          promoCode && promoValidation?.valid
            ? `Essai gratuit de ${formattedTotalTrial} démarré avec le code promo: ${promoCode.toUpperCase()}`
            : `Essai gratuit de ${formattedTotalTrial} démarré`,
      });

      if (promoCode && promoValidation?.valid) {
        await supabase.rpc('increment_promo_usage', {
          promo_code_input: promoCode,
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
              childrenCount: selectedChildren,
              monthlyPrice: price,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }

      setStep('confirmation');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || "Erreur lors de la création de l'abonnement");
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = STEP_ORDER.indexOf(step);

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
                key={plan.children}
                onClick={() => setSelectedChildren(plan.children)}
                className={`p-6 rounded-2xl border-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-center mb-3">
                  <Users className={isSelected ? 'text-blue-500' : 'text-gray-400'} size={32} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{plan.children}</div>
                <div className="text-sm text-gray-600 mb-3">{plan.children === 1 ? 'enfant' : 'enfants'}</div>
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
          setStep('payment');
        }}
        className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-xl rounded-xl hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
      >
        Continuer vers le paiement
        <ArrowRight size={24} />
      </button>
    </div>
  );

  const paymentStep = (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Résumé de votre essai</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <div className="flex items-center justify-between">
                <span>Formule sélectionnée</span>
                <span className="font-semibold">{selectedChildren} {selectedChildren === 1 ? 'enfant' : 'enfants'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Période de facturation</span>
                <span className="font-semibold">{billingPeriod === 'monthly' ? 'Mensuelle' : 'Annuelle'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Prix par {billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                <span className="font-semibold">{price.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3">
            <h4 className="text-lg font-semibold text-blue-900">Informations sur la facturation</h4>
            <p className="text-sm text-blue-800">
              Aujourd'hui, vous payez <span className="font-bold">0,00 €</span>.
            </p>
            <p className="text-sm text-blue-800">
              Après <span className="font-bold">7 jours</span>, si vous n'annulez pas votre essai, le montant de{' '}
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
            <p className="text-sm text-white/80 mb-6">Confirmez votre essai gratuit et accédez immédiatement à PioPi.</p>
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

            <button
              onClick={handleConfirmSubscription}
              disabled={loading}
              className="w-full py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-purple-600 border-t-transparent"></div>
                  Confirmation en cours...
                </>
              ) : (
                <>
                  Confirmer mon essai gratuit
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
            <span className="font-semibold">{selectedChildren} {selectedChildren === 1 ? 'enfant' : 'enfants'}</span>
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
            {STEP_ORDER.map((flowStep, index) => (
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
                {index < STEP_ORDER.length - 1 && (
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
        {step === 'payment' && paymentStep}
        {step === 'confirmation' && confirmationStep}

        <div className="text-center space-y-4 mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-sm text-yellow-800 font-semibold mb-2">Rappel important :</p>
            <ul className="text-sm text-yellow-700 space-y-1 text-left">
              <li>✓ Aucune carte bancaire demandée pendant l'essai</li>
              <li>✓ Annulation possible à tout moment</li>
              <li>✓ Suivi personnalisé pour chaque enfant</li>
            </ul>
          </div>
          <p className="text-base font-semibold text-gray-700">Vous avez des questions ? Contactez-nous à support@piopi.eu</p>
        </div>
      </div>
    </div>
  );
}
