import { ArrowLeft } from 'lucide-react';

type TermsPageProps = {
  onBack: () => void;
};

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition"
        >
          <ArrowLeft size={20} />
          <span>Retour</span>
        </button>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Conditions Générales d'Utilisation</h1>
          <p className="text-gray-600 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <div className="prose prose-lg max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Présentation du service</h2>
              <p className="text-gray-700 leading-relaxed">
                PioPi est une plateforme éducative interactive développée par NRINFRA,
                destinée à faciliter l'apprentissage des enfants de manière ludique et engageante.
                La plateforme propose des contenus éducatifs adaptés aux programmes scolaires français.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Acceptation des conditions</h2>
              <p className="text-gray-700 leading-relaxed">
                En accédant et en utilisant PioPi, vous acceptez d'être lié par les présentes
                conditions générales d'utilisation. Si vous n'acceptez pas ces conditions, veuillez
                ne pas utiliser notre service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Inscription et compte utilisateur</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Pour accéder à certaines fonctionnalités, vous devez créer un compte. Vous vous engagez à :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Fournir des informations exactes et à jour</li>
                <li>Maintenir la confidentialité de vos identifiants de connexion</li>
                <li>Être responsable de toutes les activités sur votre compte</li>
                <li>Notifier immédiatement NRINFRA de toute utilisation non autorisée</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Utilisation du service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Vous acceptez d'utiliser PioPi uniquement à des fins légales et conformément aux présentes conditions.
                Il est strictement interdit de :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Violer les droits de propriété intellectuelle</li>
                <li>Transmettre du contenu illégal, offensant ou inapproprié</li>
                <li>Tenter d'accéder de manière non autorisée au système</li>
                <li>Perturber ou interférer avec le fonctionnement de la plateforme</li>
                <li>Utiliser le service à des fins commerciales sans autorisation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Propriété intellectuelle</h2>
              <p className="text-gray-700 leading-relaxed">
                Tous les contenus présents sur PioPi (textes, images, graphiques, logos, etc.)
                sont la propriété exclusive de NRINFRA ou de ses partenaires et sont protégés par les
                lois sur la propriété intellectuelle. Toute reproduction, distribution ou utilisation
                non autorisée est strictement interdite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Protection des données personnelles</h2>
              <p className="text-gray-700 leading-relaxed">
                La collecte et le traitement de vos données personnelles sont effectués conformément
                à notre Politique de Confidentialité et au Règlement Général sur la Protection des Données (RGPD).
                Nous nous engageons à protéger la vie privée de nos utilisateurs, en particulier celle des enfants.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Responsabilité</h2>
              <p className="text-gray-700 leading-relaxed">
                NRINFRA s'efforce de maintenir la disponibilité et la qualité du service, mais ne peut
                garantir un accès ininterrompu. NRINFRA ne pourra être tenu responsable des dommages
                directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Modifications du service</h2>
              <p className="text-gray-700 leading-relaxed">
                NRINFRA se réserve le droit de modifier, suspendre ou interrompre tout ou partie du
                service à tout moment, avec ou sans préavis. Nous nous réservons également le droit
                de modifier les présentes conditions générales à tout moment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Résiliation</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment,
                sans préavis, en cas de violation des présentes conditions ou pour toute autre raison
                jugée nécessaire.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Droit applicable</h2>
              <p className="text-gray-700 leading-relaxed">
                Les présentes conditions sont régies par le droit français. Tout litige relatif à
                l'utilisation d'PioPi sera soumis à la compétence exclusive des tribunaux français.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                Pour toute question concernant ces conditions générales, veuillez nous contacter à :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700">
                  <strong>NRINFRA</strong><br />
                  92 avenue de Turin<br />
                  73000 Chambéry, France<br />
                  Email : <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
