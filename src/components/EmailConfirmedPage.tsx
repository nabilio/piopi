import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

export function EmailConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    confirmEmail();
  }, []);

  async function confirmEmail() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token de confirmation manquant');
        return;
      }

      const { data, error } = await supabase.rpc('confirm_email_token', {
        confirmation_token: token,
      });

      if (error) throw error;

      if (data && data.success) {
        setStatus('success');
        setMessage('Votre email a été confirmé avec succès ! Vous allez être redirigé automatiquement...');

        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          window.location.href = '/?confirmed=true';
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data?.error || 'Token invalide ou expiré');
      }
    } catch (err: any) {
      console.error('Email confirmation error:', err);
      setStatus('error');
      setMessage(err.message || 'Erreur lors de la confirmation');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Logo size={48} />
            <h1 className="text-3xl font-black text-gray-900">
              PioPi
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader size={64} className="mx-auto text-blue-500 animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirmation en cours...
                </h2>
                <p className="text-gray-600">
                  Veuillez patienter pendant que nous confirmons votre email.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email confirmé !
                </h2>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-green-700 font-semibold">
                    Redirection automatique vers la page de connexion...
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition"
                >
                  Se connecter maintenant
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Erreur de confirmation
                </h2>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-700">
                    Le lien de confirmation est peut-être expiré ou invalide.
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition"
                >
                  Retour à la page d'accueil
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
