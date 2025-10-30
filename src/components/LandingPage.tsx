import { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Users, Trophy, Rocket, Star, Award, Zap, Heart, Target, Brain, Globe, TrendingUp, Check, Euro, Mail, Lock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useTrialConfig } from '../hooks/useTrialConfig';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';

type LandingPageProps = {
  onRegisterClick: () => void;
  onContactClick?: () => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
  onLegalClick?: () => void;
};

export function LandingPage({ onRegisterClick, onContactClick, onTermsClick, onPrivacyClick, onLegalClick }: LandingPageProps) {
  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const { showToast } = useToast();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { formattedBaseTrial, promoHeadline, promoBanner } = useTrialConfig();
  const heroTrialBadge = promoHeadline;
  const trialFeatureLabel = formattedBaseTrial ? `Essai gratuit: ${formattedBaseTrial}` : 'Essai gratuit offert';
  const scrollToPricing = () => {
    if (typeof document === 'undefined') return;
    const pricingSection = document.getElementById('pricing');
    pricingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check if user just confirmed their email
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      showToast('Email confirmé avec succès ! Vous pouvez maintenant vous connecter.', 'success');
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError('Erreur lors de la connexion avec Google');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      showToast('Un email de réinitialisation a été envoyé à votre adresse', 'success');

      // Fermer le modal après 3 secondes
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetSuccess(false);
      }, 3000);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l\'envoi de l\'email', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">

      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

              {/* Auth form - shown first on mobile, second on desktop */}
              <div className="lg:sticky lg:top-8 order-1 lg:order-2">
                <div className="max-w-md mx-auto">
                  {/* Logo et nom du site - visible sur mobile */}
                  <div className="lg:hidden mb-8 text-center">
                    <div className="flex flex-col items-center gap-4 mb-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-4xl font-bold text-white">P</span>
                      </div>
                      <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        PioPi
                      </h1>
                    </div>
                    <p className="text-gray-700 text-lg font-medium px-4">
                      La plateforme éducative qui transforme l'apprentissage en aventure ludique et sociale pour vos enfants
                    </p>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Accédez à votre compte PioPi
                  </h2>

                  {error && (
                    <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl mb-4 font-semibold">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5 mb-5">
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-medium shadow-sm text-base"
                          placeholder="Email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-medium shadow-sm text-base"
                          placeholder="Mot de passe"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 shadow-lg text-base"
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </button>

                    <div className="text-center mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(loginEmail);
                          setShowResetModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-transparent text-gray-600 font-semibold">ou</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3.5 bg-white/90 backdrop-blur-sm border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-white transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg text-base"
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
                    Continuer avec Google
                  </button>

                  <div className="mt-8 text-center">
                    <p className="text-gray-700 text-lg font-semibold">
                      Besoin d'un compte ? Choisissez un forfait ci-dessous pour finaliser l'inscription.
                    </p>
                    <button
                      onClick={scrollToPricing}
                      className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg"
                    >
                      Voir les forfaits
                    </button>
                  </div>
                </div>
              </div>

              {/* Hero content - shown second on mobile, first on desktop */}
              <div className="text-center lg:text-left order-2 lg:order-1">
                <div className="flex gap-4 mb-8 justify-center lg:justify-start">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce">
                    <Sparkles size={32} className="text-white" />
                  </div>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-400 to-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}>
                    <Star size={32} className="text-white" />
                  </div>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}>
                    <Heart size={32} className="text-white" />
                  </div>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6 leading-tight">
                  PioPi
                </h1>
                <p className="text-3xl md:text-4xl text-gray-800 mb-6 font-bold">
                  Transforme l'école en aventure !
                </p>
                <p className="text-xl text-gray-600 mb-4 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                  La plateforme éducative et sociale qui fait aimer l'école aux enfants. Un environnement sécurisé où vos enfants apprennent, partagent leurs réussites et créations avec leurs amis, tout sous contrôle parental.
                </p>
                <div className="flex flex-wrap gap-4 mb-10 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                    <Zap className="text-yellow-500" size={20} />
                    <span className="font-semibold text-gray-700">{heroTrialBadge}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                    <Target className="text-green-500" size={20} />
                    <span className="font-semibold text-gray-700">Suivi personnalisé</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                    <Brain className="text-purple-500" size={20} />
                    <span className="font-semibold text-gray-700">Coach IA inclus</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                    <Users className="text-blue-500" size={20} />
                    <span className="font-semibold text-gray-700">Réseau social sécurisé</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 bg-gradient-to-b from-transparent to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-green-100 text-green-700 px-6 py-3 rounded-full font-black text-lg mb-6 border-2 border-green-300">
                {promoBanner}
              </div>
              <h2 className="text-5xl font-black text-gray-800 mb-4">
                Tarification simple et transparente
              </h2>
              <p className="text-xl text-gray-600">
                Seulement 2€ par enfant par mois après l'essai gratuit
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Plan Basique */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200 hover:border-blue-400 transition">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Basique</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-gray-800">2€</span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-600">1 enfant</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tous les cours et exercices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Suivi de progression</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Mode bataille</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Réseau social sécurisé</span>
                  </li>
                </ul>
                <button
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
                >
                  Choisir
                </button>
              </div>

              {/* Plan Duo */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-blue-500 relative hover:scale-105 transition">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  Populaire
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Duo</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-blue-600">3€</span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-600">Jusqu'à 2 enfants</p>
                  <div className="mt-2 bg-green-50 border border-green-300 rounded-lg px-2 py-1">
                    <p className="text-xs text-green-700 font-bold">1,50€ par enfant</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tous les cours et exercices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Suivi détaillé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Mode bataille</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Réseau social sécurisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-semibold">{trialFeatureLabel}</span>
                  </li>
                </ul>
                <button
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition shadow-lg"
                >
                  Choisir
                </button>
              </div>

              {/* Plan Famille */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200 hover:border-blue-400 transition">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Famille</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-gray-800">5€</span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-600">Jusqu'à 3 enfants</p>
                  <div className="mt-2 bg-green-50 border border-green-300 rounded-lg px-2 py-1">
                    <p className="text-xs text-green-700 font-bold">1,67€ par enfant</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tous les cours et exercices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Suivi avancé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Mode bataille</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Réseau social sécurisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-semibold">{trialFeatureLabel}</span>
                  </li>
                </ul>
                <button
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
                >
                  Choisir
                </button>
              </div>

              {/* Plan Premium */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-300 hover:border-purple-500 transition">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Premium</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-purple-600">6€</span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-600">Jusqu'à 4 enfants</p>
                  <div className="mt-2 bg-green-50 border border-green-300 rounded-lg px-2 py-1">
                    <p className="text-xs text-green-700 font-bold">1,50€ par enfant</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tous les cours et exercices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Suivi avancé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Mode bataille</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Réseau social sécurisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Support prioritaire</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-semibold">{trialFeatureLabel}</span>
                  </li>
                </ul>
                <button
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition shadow-lg"
                >
                  Choisir
                </button>
              </div>

              {/* Plan Liberté */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-amber-300 hover:border-amber-500 transition">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Liberté</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-black text-amber-600">8€</span>
                    <span className="text-gray-600">/mois</span>
                  </div>
                  <p className="text-sm text-gray-600">Jusqu'à 5 enfants</p>
                  <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1">
                    <p className="text-xs text-amber-700 font-bold">+2€ par enfant supplémentaire</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Jusqu'à 5 enfants inclus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Ajoutez des enfants supplémentaires à tout moment (+2€/enfant)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Tous les cours et exercices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Suivi de progression avancé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Mode bataille</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Réseau social sécurisé</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Support prioritaire VIP</span>
                  </li>
                </ul>
                <button
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition shadow-lg"
                >
                  Choisir
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600 text-lg">
                <strong>💡 Astuce :</strong> Plus vous avez d'enfants, plus vous économisez par enfant !
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black text-gray-800 mb-6">
                Une communauté nationale
              </h2>
              <p className="text-2xl text-gray-700 font-semibold max-w-3xl mx-auto">
                De Dunkerque à Marseille, de Brest à Strasbourg, des milliers de familles nous font confiance !
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl transform hover:scale-105 transition">
                <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                  <Globe className="text-white" size={40} />
                </div>
                <div>
                  <p className="font-black text-3xl text-gray-800">101 Départements</p>
                  <p className="text-gray-600 font-medium text-lg">Toute la France est couverte !</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl transform hover:scale-105 transition">
                <div className="bg-purple-500 p-4 rounded-xl shadow-lg">
                  <Users className="text-white" size={40} />
                </div>
                <div>
                  <p className="font-black text-3xl text-gray-800">Communauté active</p>
                  <p className="text-gray-600 font-medium text-lg">Élèves, parents, professeurs réunis</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gradient-to-r from-pink-50 to-pink-100 p-6 rounded-xl transform hover:scale-105 transition">
                <div className="bg-pink-500 p-4 rounded-xl shadow-lg">
                  <BookOpen className="text-white" size={40} />
                </div>
                <div>
                  <p className="font-black text-3xl text-gray-800">CP à Terminale</p>
                  <p className="text-gray-600 font-medium text-lg">Tous les niveaux scolaires</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl transform hover:scale-105 transition">
                <div className="bg-green-500 p-4 rounded-xl shadow-lg">
                  <TrendingUp className="text-white" size={40} />
                </div>
                <div>
                  <p className="font-black text-3xl text-gray-800">Résultats prouvés</p>
                  <p className="text-gray-600 font-medium text-lg">+35% de progression moyenne</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200/30 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-green-200/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black text-gray-800 mb-4">
              Pourquoi choisir PioPi ?
            </h2>
            <p className="text-2xl text-gray-600 font-semibold">
              Une méthode révolutionnaire qui donne des résultats
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 text-center transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border-4 border-blue-200">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:rotate-12 transition">
                <Rocket size={36} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">Apprentissage ludique</h3>
              <p className="text-gray-700 font-medium leading-relaxed">
                Transforme chaque leçon en jeu captivant. Les enfants adorent apprendre sans s'en rendre compte !
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 text-center transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border-4 border-purple-200">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:rotate-12 transition">
                <Trophy size={36} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">Système de récompenses</h3>
              <p className="text-gray-700 font-medium leading-relaxed">
                Points, badges, trophées ! Chaque effort est célébré et récompensé pour maintenir la motivation
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl p-8 text-center transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border-4 border-pink-200">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:rotate-12 transition">
                <Users size={36} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">Réseau social sécurisé</h3>
              <p className="text-gray-700 font-medium leading-relaxed">
                Connecte-toi avec d'autres élèves, partage tes succès et progressez ensemble dans un environnement sûr
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 text-center transform hover:scale-105 hover:shadow-2xl transition-all duration-300 border-4 border-orange-200">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:rotate-12 transition">
                <Brain size={36} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">Coach IA intelligent</h3>
              <p className="text-gray-700 font-medium leading-relaxed">
                Un assistant personnel disponible 24/7 pour aider avec les devoirs et répondre aux questions
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400 rounded-3xl p-10 max-w-4xl mx-auto shadow-2xl">
            <div className="text-center text-white">
              <Zap size={56} className="mx-auto mb-4" />
              <h3 className="text-4xl font-black mb-4">Des résultats concrets</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <p className="text-5xl font-black mb-2">92%</p>
                  <p className="font-bold text-lg">de satisfaction</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <p className="text-5xl font-black mb-2">+35%</p>
                  <p className="font-bold text-lg">de progression moyenne</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                  <p className="text-5xl font-black mb-2">10k+</p>
                  <p className="font-bold text-lg">élèves inscrits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="flex justify-center gap-3 mb-6">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Award size={48} />
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Star size={48} />
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Trophy size={48} />
              </div>
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-6">
              Découvrez nos forfaits en famille
            </h2>
            <p className="text-2xl md:text-3xl mb-8 font-bold text-white/95">
              Des milliers d'élèves progressent déjà...
            </p>
            <p className="text-xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Connectez-vous avec votre email ou Google. Créez votre compte parent pendant la sélection du forfait qui correspond à votre famille.
            </p>
            <button
              onClick={scrollToPricing}
              className="bg-white text-purple-600 px-16 py-6 rounded-full text-2xl font-black shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 hover:bg-yellow-300 hover:text-purple-700"
            >
              Voir les forfaits
            </button>
            <p className="mt-8 text-white/80 text-lg">
              Accessible sur ordinateur, tablette et mobile
            </p>
          </div>
        </div>
      </section>

      {/* Modal de réinitialisation de mot de passe */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetEmail('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
                <Mail size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">
                Réinitialiser le mot de passe
              </h3>
              <p className="text-gray-600">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {resetSuccess ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                  <Check size={40} className="text-green-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Email envoyé !</h4>
                  <p className="text-gray-600">
                    Un lien de réinitialisation a été envoyé à<br />
                    <span className="font-semibold text-gray-800">{resetEmail}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-3">
                    Vérifiez votre boîte de réception et vos spams
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 shadow-lg"
                >
                  {resetLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer
        onContactClick={onContactClick || (() => {})}
        onTermsClick={onTermsClick || (() => {})}
        onPrivacyClick={onPrivacyClick || (() => {})}
        onLegalClick={onLegalClick || (() => {})}
        onLogoClick={() => window.location.href = 'https://www.piopi.eu'}
      />

      <CookieConsent onLearnMore={() => onPrivacyClick?.()} />
    </div>
  );
}
