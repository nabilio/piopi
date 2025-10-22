import { Mail, CheckCircle, AlertCircle, ArrowLeft, Sparkles, Star, Trophy, Heart, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';

type EmailConfirmationProps = {
  email: string;
  onResend: () => void;
};

export function EmailConfirmation({ email, onResend }: EmailConfirmationProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkEmailConfiguration();
  }, []);

  async function checkEmailConfiguration() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email_confirmed_at) {
      setIsConfigured(false);
    } else {
      setIsConfigured(true);
    }
  }

  if (isConfigured === null) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/50">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                <AlertCircle className="text-yellow-600" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Configuration incomplète
              </h2>
              <p className="text-gray-600">
                La confirmation d'email n'est pas activée
              </p>
            </div>

            <div className="bg-yellow-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-yellow-800 mb-4">
                <strong>Pour activer la confirmation d'email :</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                <li>Allez dans votre dashboard Supabase</li>
                <li>Authentication → Settings</li>
                <li>Configurez un fournisseur d'email (Resend recommandé)</li>
                <li>Activez "Enable email confirmations"</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition shadow-lg"
            >
              Continuer vers l'application
            </button>
          </div>
        </div>
      </div>
    );
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

        <div className="absolute top-1/2 left-16 animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Trophy size={32} className="text-yellow-400" />
          </div>
        </div>

        <div className="absolute bottom-1/4 right-20 animate-float" style={{ animationDelay: '2s' }}>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Heart size={24} className="text-pink-300" />
          </div>
        </div>

        <div className="absolute top-2/3 left-1/3 animate-float" style={{ animationDelay: '1.5s' }}>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <Rocket size={28} className="text-blue-300" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
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

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/50">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition font-semibold"
            >
              <ArrowLeft size={20} />
              <span>Retour à l'accueil</span>
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Logo size={48} />
                <h1 className="text-3xl font-black text-gray-900">
                  PioPi
                </h1>
              </div>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <Mail className="text-blue-500" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Vérifiez votre email
              </h2>
              <p className="text-gray-600">
                Nous avons envoyé un email de confirmation à
              </p>
              <p className="text-blue-600 font-semibold mt-2 break-all">
                {email}
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-semibold">Prochaines étapes :</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Ouvrez votre boîte mail</li>
                    <li>Cliquez sur le lien de confirmation</li>
                    <li>Revenez sur cette page pour vous connecter</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Vous n'avez pas reçu l'email ?
              </p>
              <button
                onClick={onResend}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition shadow-md"
              >
                Renvoyer l'email
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note :</strong> Vérifiez également votre dossier spam ou courrier indésirable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
