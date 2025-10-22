import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type AuthModalProps = {
  onClose: () => void;
  onRegisterClick?: () => void;
};

export function AuthModal({ onClose, onRegisterClick }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup-parent' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            try {
              const checkResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-auth-provider`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({ email }),
                }
              );

              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData.exists && checkData.isGoogleAuth) {
                  setError('Ce compte a été créé avec Google. Veuillez utiliser "Se connecter avec Google" pour vous connecter.');
                  setLoading(false);
                  return;
                }
              }
            } catch (checkError) {
              console.error('Error checking auth provider:', checkError);
            }
          }
          throw error;
        }

        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
          setLoading(false);
          return;
        }

        await signIn(email, password);
        onClose();
      } else if (mode === 'forgot-password') {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
        }

        setSuccess(result.message || 'Un email de réinitialisation a été envoyé à votre adresse email.');
      } else {
        try {
          await signUp(email, password, fullName, 'parent', undefined);
          onClose();
        } catch (signUpError: any) {
          if (signUpError.message?.includes('User already registered') || signUpError.message?.includes('already registered')) {
            try {
              const checkResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-auth-provider`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({ email }),
                }
              );

              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData.exists && checkData.isGoogleAuth) {
                  setError('Ce compte existe déjà avec Google. Veuillez utiliser "Se connecter avec Google" pour vous connecter.');
                  setLoading(false);
                  return;
                }
              }
            } catch (checkError) {
              console.error('Error checking auth provider:', checkError);
            }
          }
          throw signUpError;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(`Erreur: ${err.message || 'Erreur lors de la connexion avec Google'}`);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-6 lg:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={24} />
        </button>

        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">
          {mode === 'signin' ? 'Connexion' : mode === 'forgot-password' ? 'Mot de passe oublié' : 'Créer un compte parent'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup-parent' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
              required
            />
          </div>

          {mode !== 'forgot-password' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'forgot-password' && success !== '')}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
          >
            {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : mode === 'forgot-password' ? 'Envoyer le lien' : 'Créer le compte'}
          </button>
        </form>

        {mode === 'signin' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode('forgot-password');
                setError('');
                setSuccess('');
              }}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {mode !== 'forgot-password' && (
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
              onClick={handleGoogleSignIn}
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
              Continuer avec Google
            </button>
          </>
        )}

        <div className="mt-6 text-center space-y-2">
          {mode === 'signin' ? (
            <button
              onClick={() => {
                if (onRegisterClick) {
                  onRegisterClick();
                } else {
                  setMode('signup-parent');
                }
              }}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Pas encore de compte ? Créer un compte
            </button>
          ) : mode === 'forgot-password' ? (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setSuccess('');
              }}
              className="text-gray-600 hover:underline text-sm"
            >
              Retour à la connexion
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setSuccess('');
              }}
              className="text-gray-600 hover:underline text-sm"
            >
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
