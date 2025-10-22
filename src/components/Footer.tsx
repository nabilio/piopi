import { Logo } from './Logo';

type FooterProps = {
  onContactClick: () => void;
  onTermsClick: () => void;
  onPrivacyClick: () => void;
  onLegalClick: () => void;
  onLogoClick?: () => void;
};

export function Footer({ onContactClick, onTermsClick, onPrivacyClick, onLegalClick, onLogoClick }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-3 md:py-12">
        <div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-8 max-w-4xl mx-auto">
          {/* Company Info */}
          <div>
            <button
              onClick={onLogoClick}
              className="flex items-center gap-2 md:gap-3 mb-1 md:mb-4 hover:opacity-80 transition cursor-pointer"
            >
              <Logo size={28} className="flex-shrink-0 md:w-10 md:h-10" />
              <h3 className="text-white text-sm md:text-lg font-bold">PioPi</h3>
            </button>
            <p className="text-xs md:text-sm mb-2 md:mb-4 hidden md:block">
              Plateforme éducative interactive pour l'apprentissage en s'amusant.
              Transformez l'éducation de vos enfants avec une expérience ludique et engageante.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-sm md:text-lg font-bold mb-1 md:mb-4 hidden md:block">Liens rapides</h3>
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 md:space-y-2 md:block">
              <li>
                <button
                  onClick={onContactClick}
                  className="text-[11px] md:text-sm hover:text-white transition"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  onClick={onTermsClick}
                  className="text-[11px] md:text-sm hover:text-white transition"
                >
                  CGU
                </button>
              </li>
              <li>
                <button
                  onClick={onPrivacyClick}
                  className="text-[11px] md:text-sm hover:text-white transition"
                >
                  Confidentialité
                </button>
              </li>
              <li>
                <button
                  onClick={onLegalClick}
                  className="text-[11px] md:text-sm hover:text-white transition"
                >
                  Mentions légales
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-2 md:mt-8 pt-2 md:pt-8 text-center text-[10px] md:text-sm">
          <p>&copy; {new Date().getFullYear()} PioPi. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
