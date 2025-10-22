import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

type CookieConsentProps = {
  onLearnMore?: () => void;
};

export function CookieConsent({ onLearnMore }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      window.location.href = '/privacy';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Cookie className="text-white" size={24} />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Respect de votre vie privée
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Nous utilisons des cookies essentiels pour assurer le bon fonctionnement de notre site et améliorer votre expérience.
              En continuant à naviguer, vous acceptez notre utilisation des cookies conformément au RGPD.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAccept}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
              >
                Accepter
              </button>
              <button
                onClick={handleDecline}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Refuser
              </button>
              <button
                onClick={handleLearnMore}
                className="px-6 py-2.5 text-blue-600 font-semibold hover:text-blue-700 transition flex items-center"
              >
                En savoir plus
              </button>
            </div>
          </div>

          <button
            onClick={handleDecline}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Fermer"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
