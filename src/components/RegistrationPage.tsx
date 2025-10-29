import { useMemo, useState } from 'react';
import { Check, ArrowRight, Users, Mail, Lock, User, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmailConfirmation } from './EmailConfirmation';
import { useAuth } from '../contexts/AuthContext';
import { useTrialConfig, formatTrialDuration } from '../hooks/useTrialConfig';

type PricingPlan = {
  children: number;
  monthlyPrice: number;
  yearlyPrice: number;
};

const PRICING_PLANS: PricingPlan[] = [
  { children: 1, monthlyPrice: 2.00, yearlyPrice: 20.00 },
  { children: 2, monthlyPrice: 3.50, yearlyPrice: 35.00 },
  { children: 3, monthlyPrice: 5.00, yearlyPrice: 50.00 },
  { children: 4, monthlyPrice: 6.00, yearlyPrice: 60.00 },
];

export function RegistrationPage({ onSuccess }: { onSuccess: () => void }) {
  const { signInWithGoogle } = useAuth();
  const [step, setStep] = useState<'plan' | 'details' | 'email-confirmation'>('plan');
  const [selectedChildren, setSelectedChildren] = useState(1);
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
  const { baseTrialDays, formattedBaseTrial, promoHeadline: trialHeadline } = useTrialConfig();

  const selectedPlan = PRICING_PLANS.find(p => p.children === selectedChildren) || PRICING_PLANS[0];
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
    } catch (err) {
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

      if (data.needsEmailConfirmation) {
        setStep('email-confirmation');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      if (error) throw error;
      alert('Email de confirmation renvoyé !');
    } catch (err: any) {
      alert('Erreur lors du renvoi : ' + err.message);
    }
  }

  if (step === 'email-confirmation') {
    return <EmailConfirmation email={formData.email} onResend={handleResendEmail} />;
  }

  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Commencez votre aventure d'apprentissage
            </h1>
            <p className="text-xl text-gray-600">
              {trialHeadline}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-xl font-semibold transition ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-xl font-semibold transition relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annuel
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  -17%
                </span>
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-center text-lg font-semibold text-gray-700 mb-4">
                Combien d'enfants souhaitez-vous inscrire ?
              </label>
              <div className="flex items-center justify-center gap-4">
                <Users className="text-gray-400" size={24} />
                <select
                  value={selectedChildren}
                  onChange={(e) => setSelectedChildren(Number(e.target.value))}
                  className="text-2xl font-bold px-6 py-3 rounded-xl border-2 border-blue-300 focus:border-blue-500 focus:outline-none bg-white"
                >
                  {PRICING_PLANS.map(plan => (
                    <option key={plan.children} value={plan.children}>
                      {plan.children} {plan.children === 1 ? 'enfant' : 'enfants'}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">
                Vous pourrez ajouter d'autres profils d'enfants à tout moment
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {price.toFixed(2)} €
                  <span className="text-2xl text-gray-600 font-normal">
                    /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </span>
                </div>
                <div className="inline-block bg-green-500 text-white px-4 py-2 rounded-full font-semibold text-sm">
                  Essai gratuit de {summaryTrialLabel}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Premier prélèvement le {firstChargeDate.toLocaleDateString('fr-FR')}
                </p>
                {promoValidation?.valid && (
                  <p className="text-xs text-green-700 mt-1">
                    Code promo appliqué : votre essai total dure {formattedTotalTrial}.
                  </p>
                )}
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="text-white" size={16} />
                  </div>
                  <span>Accès complet au programme scolaire français</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="text-white" size={16} />
                  </div>
                  <span>Leçons interactives et quiz personnalisés</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="text-white" size={16} />
                  </div>
                  <span>Suivi des progrès en temps réel</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="text-white" size={16} />
                  </div>
                  <span>Système de gamification et récompenses</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="text-white" size={16} />
                  </div>
                  <span>Support familial et réseau social sécurisé</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setStep('details')}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-2 text-lg"
            >
              Continuer
              <ArrowRight size={20} />
            </button>

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
                } catch (err: any) {
                  console.error('Google sign in error:', err);
                  alert('Erreur lors de la connexion avec Google');
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
          </div>

          <p className="text-center text-sm text-gray-500">
            Résiliez à tout moment. Sans engagement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Créez votre compte</h2>
            <p className="text-gray-600">
              {selectedChildren} {selectedChildren === 1 ? 'enfant' : 'enfants'} - {price.toFixed(2)} €/{billingPeriod === 'monthly' ? 'mois' : 'an'}
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
                Vous recevrez un email de confirmation
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
