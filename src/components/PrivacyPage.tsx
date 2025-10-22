import { ArrowLeft } from 'lucide-react';

type PrivacyPageProps = {
  onBack: () => void;
};

export function PrivacyPage({ onBack }: PrivacyPageProps) {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Politique de Confidentialité</h1>
          <p className="text-gray-600 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <div className="prose prose-lg max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                NRINFRA, éditeur de la plateforme PioPi, accorde une importance particulière
                à la protection de vos données personnelles et à la vie privée de nos utilisateurs,
                en particulier celle des enfants. Cette politique de confidentialité décrit comment
                nous collectons, utilisons, stockons et protégeons vos informations personnelles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Responsable du traitement</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>NRINFRA</strong><br />
                  Représentée par Rouijel Nabil<br />
                  92 avenue de Turin<br />
                  73000 Chambéry, France<br />
                  Email : <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Données collectées</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nous collectons différents types de données personnelles :
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Données d'inscription</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>Nom complet</li>
                <li>Adresse email</li>
                <li>Mot de passe (chiffré)</li>
                <li>Date de naissance (pour les enfants)</li>
                <li>Niveau scolaire</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Données d'utilisation</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                <li>Progression dans les leçons et quiz</li>
                <li>Résultats et scores obtenus</li>
                <li>Temps passé sur la plateforme</li>
                <li>Préférences d'apprentissage</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Données techniques</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Adresse IP</li>
                <li>Type de navigateur</li>
                <li>Système d'exploitation</li>
                <li>Données de connexion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Finalités du traitement</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Vos données personnelles sont collectées et traitées pour les finalités suivantes :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Création et gestion de votre compte utilisateur</li>
                <li>Fourniture et amélioration de nos services éducatifs</li>
                <li>Personnalisation de l'expérience d'apprentissage</li>
                <li>Suivi de la progression pédagogique</li>
                <li>Communication avec les parents concernant l'évolution de leurs enfants</li>
                <li>Sécurisation de la plateforme et prévention des fraudes</li>
                <li>Respect de nos obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Base légale du traitement</h2>
              <p className="text-gray-700 leading-relaxed">
                Le traitement de vos données personnelles repose sur les bases légales suivantes :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>L'exécution du contrat de service avec vous</li>
                <li>Votre consentement (que vous pouvez retirer à tout moment)</li>
                <li>Le respect de nos obligations légales</li>
                <li>Notre intérêt légitime à améliorer nos services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Protection des données des enfants</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous accordons une attention particulière à la protection des données des enfants.
                Conformément au RGPD et à la législation française, le traitement des données personnelles
                des enfants de moins de 15 ans nécessite le consentement des parents. Les parents ont
                un droit de regard et de contrôle sur les données de leurs enfants et peuvent à tout
                moment demander leur suppression.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Durée de conservation</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous conservons vos données personnelles uniquement pendant la durée nécessaire aux
                finalités pour lesquelles elles ont été collectées, ou conformément aux obligations légales :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Données de compte : pendant toute la durée d'utilisation du service</li>
                <li>Données de progression : pendant la durée d'utilisation du service</li>
                <li>Données de connexion : 12 mois maximum</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Sécurité des données</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                protéger vos données personnelles contre tout accès non autorisé, modification,
                divulgation ou destruction, incluant :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Chiffrement des données sensibles</li>
                <li>Accès sécurisé et authentification forte</li>
                <li>Surveillance et détection des incidents de sécurité</li>
                <li>Formation régulière de notre personnel</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Partage des données</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous ne vendons pas vos données personnelles. Nous pouvons partager vos données uniquement :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Avec des prestataires de services techniques sous contrat de confidentialité</li>
                <li>Si la loi l'exige ou pour protéger nos droits légaux</li>
                <li>Avec votre consentement explicite</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Vos droits</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification</strong> : corriger vos données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
                <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement</strong> à tout moment</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                Notre site utilise des cookies essentiels au fonctionnement du service (authentification,
                préférences). Nous n'utilisons pas de cookies publicitaires. Vous pouvez configurer
                votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications de la politique</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous pouvons modifier cette politique de confidentialité pour refléter les changements
                dans nos pratiques ou pour des raisons légales. Nous vous informerons de tout changement
                significatif par email ou via un avis sur notre plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Réclamations</h2>
              <p className="text-gray-700 leading-relaxed">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
                réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700">
                  CNIL<br />
                  3 Place de Fontenoy<br />
                  TSA 80715<br />
                  75334 PARIS CEDEX 07<br />
                  Téléphone : 01 53 73 22 22<br />
                  Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.cnil.fr</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                Pour toute question concernant cette politique de confidentialité ou le traitement de
                vos données personnelles, contactez-nous :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700">
                  Email : <a href="mailto:contact@piopi.eu" className="text-blue-600 hover:underline">contact@piopi.eu</a><br />
                  Courrier : NRINFRA, 92 avenue de Turin, 73000 Chambéry, France
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
