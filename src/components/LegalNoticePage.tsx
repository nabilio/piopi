import { ArrowLeft } from 'lucide-react';

type LegalNoticePageProps = {
  onBack: () => void;
};

export function LegalNoticePage({ onBack }: LegalNoticePageProps) {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Mentions Légales</h1>
          <p className="text-gray-600 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <div className="prose prose-lg max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Informations légales</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Éditeur du site</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  <strong>Raison sociale :</strong> NRINFRA<br />
                  <strong>Représentant légal :</strong> Rouijel Nabil, Fondateur<br />
                  <strong>Adresse :</strong> 92 avenue de Turin, 73000 Chambéry, France<br />
                  <strong>Email :</strong> <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a>
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Hébergement</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  Le site PioPi est hébergé par :<br />
                  <strong>Supabase Inc.</strong><br />
                  970 Toa Payoh North, #07-04<br />
                  Singapore 318992
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Propriété intellectuelle</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Le site PioPi et l'ensemble de son contenu (structure, textes, images, graphismes,
                logos, icônes, sons, logiciels, bases de données) sont la propriété exclusive de NRINFRA,
                sauf mention contraire.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Toute représentation, reproduction, adaptation ou exploitation partielle ou totale des
                contenus, marques déposées et services proposés par le site, par quelque procédé que ce
                soit, sans l'autorisation préalable, expresse et écrite de NRINFRA, est strictement
                interdite et constituerait une contrefaçon au sens des articles L. 335-2 et suivants du
                Code de la propriété intellectuelle.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Le non-respect de cette interdiction constitue une contrefaçon pouvant engager la
                responsabilité civile et pénale du contrefacteur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Limitation de responsabilité</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Contenu du site</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                NRINFRA s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées
                sur le site PioPi. Toutefois, NRINFRA ne peut garantir l'exactitude, la précision
                ou l'exhaustivité des informations mises à disposition sur ce site.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Disponibilité du service</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                NRINFRA met en œuvre tous les moyens raisonnables à sa disposition pour assurer un accès
                de qualité au site. Toutefois, NRINFRA ne garantit pas que le site sera accessible de
                manière ininterrompue et ne saurait être tenu responsable des interruptions, qu'elles
                soient volontaires ou non.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Liens externes</h3>
              <p className="text-gray-700 leading-relaxed">
                Le site PioPi peut contenir des liens hypertextes vers d'autres sites. NRINFRA
                n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur
                contenu ou à leur politique de confidentialité.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Données personnelles</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
                Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de
                suppression et d'opposition aux données personnelles vous concernant.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Pour plus d'informations sur le traitement de vos données personnelles, veuillez
                consulter notre <button onClick={onBack} className="text-blue-600 hover:underline">Politique de Confidentialité</button>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                Le site PioPi utilise des cookies strictement nécessaires à son fonctionnement,
                notamment pour la gestion de l'authentification et des préférences utilisateur. Ces
                cookies ne collectent pas de données personnelles à des fins commerciales ou publicitaires.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Droit applicable et juridiction compétente</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Les présentes mentions légales sont régies par le droit français.
              </p>
              <p className="text-gray-700 leading-relaxed">
                En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux
                français conformément aux règles de compétence en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Crédits</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>Direction de publication :</strong> Rouijel Nabil<br />
                <strong>Conception et développement :</strong> NRINFRA<br />
                <strong>Design :</strong> NRINFRA
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Pour toute question concernant les mentions légales, vous pouvez nous contacter :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Par email :</strong> <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a><br />
                  <strong>Par courrier :</strong><br />
                  NRINFRA<br />
                  92 avenue de Turin<br />
                  73000 Chambéry<br />
                  France
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Modification des mentions légales</h2>
              <p className="text-gray-700 leading-relaxed">
                NRINFRA se réserve le droit de modifier à tout moment les présentes mentions légales.
                L'utilisateur s'engage donc à les consulter régulièrement.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
