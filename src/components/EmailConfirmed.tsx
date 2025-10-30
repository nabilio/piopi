import { CheckCircle, Sparkles, BookOpen, Brain, Gift } from 'lucide-react';
import { Logo } from './Logo';
import { useTrialConfig } from '../hooks/useTrialConfig';

export function EmailConfirmed() {
  const { formattedBaseTrial } = useTrialConfig();
  const handleContinue = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Logo size={56} />
            <h2 className="text-4xl font-black text-gray-900">
              PioPi
            </h2>
          </div>

          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="text-green-600" size={56} />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
            Email confirmé ! <Sparkles className="text-yellow-500" size={32} />
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Votre email a été confirmé avec succès ! Vous allez être redirigé automatiquement...
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Gift className="text-blue-600" size={28} />
              <h3 className="text-xl font-bold text-gray-800">
                Essai gratuit de {formattedBaseTrial}
              </h3>
            </div>
            <p className="text-gray-700 mb-4">
              Profitez de toutes les fonctionnalités premium dès maintenant. Votre moyen de paiement sera débité automatiquement après l'essai si vous ne résiliez pas.
            </p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                <span>Accès illimité à tous les cours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                <span>Coach IA personnalisé 24/7</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                <span>Mode Battle et réseau social</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Prochaines étapes :</h3>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Choisissez votre formule</p>
                  <p className="text-sm text-gray-600">Sélectionnez le nombre d'enfants</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Ajoutez votre mode de paiement</p>
                  <p className="text-sm text-gray-600">Validez l'essai gratuit sécurisé</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Ajoutez vos enfants</p>
                  <p className="text-sm text-gray-600">Créez leurs profils personnalisés</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-xl rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            Continuer
            <Sparkles size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen size={24} className="text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-1">Programme Officiel</h4>
            <p className="text-xs text-gray-600">Contenu aligné sur l'Éducation Nationale 2025</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain size={24} className="text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-1">Coach IA</h4>
            <p className="text-xs text-gray-600">Assistant intelligent disponible 24/7</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={24} className="text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-1">Apprentissage Ludique</h4>
            <p className="text-xs text-gray-600">Jeux, quiz et défis amusants</p>
          </div>
        </div>
      </div>
    </div>
  );
}
