import { useState } from 'react';
import { Mail, Lock, User, Sparkles, Star, Trophy, Heart, Rocket, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EmailConfirmation } from './EmailConfirmation';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { Logo } from './Logo';
import { useTrialConfig } from '../hooks/useTrialConfig';

type SimpleRegistrationProps = {
  onSuccess: () => void;
  onBackToLogin: () => void;
  onContactClick?: () => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
  onLegalClick?: () => void;
};

export function SimpleRegistration({ onSuccess, onBackToLogin, onContactClick, onTermsClick, onPrivacyClick, onLegalClick }: SimpleRegistrationProps) {
  const { signInWithGoogle } = useAuth();
  const [step, setStep] = useState<'form' | 'email-confirmation'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { promoHeadline } = useTrialConfig();
  const trialBadgeLabel = promoHeadline;

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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-with-email-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      setStep('email-confirmation');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      if (!response.ok) {
        console.error('Error resending email');
      }
    } catch (err) {
      console.error('Error resending email:', err);
    }
  }

  async function handleGoogleSignUp() {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError('Erreur lors de la connexion avec Google');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'email-confirmation') {
    return <EmailConfirmation email={formData.email} onResend={handleResendEmail} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-yellow-400 rounded-full filter blur-3xl animate-blob animation-delay-3000"></div>
        </div>
      </div>

      {/* Floating icons with sparkle effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Sparkles className="absolute top-20 left-10 text-white opacity-30 animate-pulse" size={40} />
        <Sparkles className="absolute top-40 right-20 text-white opacity-40 animate-pulse animation-delay-1000" size={30} />
        <Sparkles className="absolute bottom-32 left-1/4 text-white opacity-35 animate-pulse animation-delay-2000" size={35} />
        <Sparkles className="absolute bottom-20 right-1/3 text-white opacity-30 animate-pulse animation-delay-3000" size={25} />

        {/* Floating icons */}
        <div className="absolute top-32 right-1/4 animate-float" style={{ animationDelay: '0s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Star size={28} className="text-yellow-300" />
          </div>
        </div>
        <div className="absolute top-1/3 left-20 animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Trophy size={28} className="text-yellow-400" />
          </div>
        </div>
        <div className="absolute bottom-1/3 right-16 animate-float" style={{ animationDelay: '2s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Heart size={28} className="text-pink-300" />
          </div>
        </div>
        <div className="absolute top-1/2 right-10 animate-float" style={{ animationDelay: '1.5s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Rocket size={28} className="text-blue-300" />
          </div>
        </div>
        <div className="absolute bottom-40 left-16 animate-float" style={{ animationDelay: '0.5s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <BookOpen size={28} className="text-purple-300" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-15px) rotate(3deg); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Main content container with centering */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-3 mb-6 hover:scale-105 transition-transform"
          >
            <div className="w-14 h-14 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-lg">
              <Logo size={36} />
            </div>
            <h1 className="text-3xl font-black text-white drop-shadow-lg">
              PioPi
            </h1>
          </button>
          <h2 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            Créer un compte
          </h2>
          <p className="text-white/90 text-lg drop-shadow-md">
            Rejoignez PioPi et transformez l'apprentissage
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold border border-white/30 shadow-lg">
              ✨ {trialBadgeLabel}
            </div>
            <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold border border-white/30 shadow-lg">
              🚀 Sans engagement
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/50">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
            >
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-3"
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
            {loading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Vous avez déjà un compte ?{' '}
              <button
                onClick={onBackToLogin}
                className="text-blue-600 font-bold hover:text-blue-700 underline"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
        </div>
      </div>

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
