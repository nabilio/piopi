import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

const FRENCH_DEPARTMENTS = [
  { code: '01', name: 'Ain' },
  { code: '02', name: 'Aisne' },
  { code: '03', name: 'Allier' },
  { code: '04', name: 'Alpes-de-Haute-Provence' },
  { code: '05', name: 'Hautes-Alpes' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '07', name: 'Ardèche' },
  { code: '08', name: 'Ardennes' },
  { code: '09', name: 'Ariège' },
  { code: '10', name: 'Aube' },
  { code: '11', name: 'Aude' },
  { code: '12', name: 'Aveyron' },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '14', name: 'Calvados' },
  { code: '15', name: 'Cantal' },
  { code: '16', name: 'Charente' },
  { code: '17', name: 'Charente-Maritime' },
  { code: '18', name: 'Cher' },
  { code: '19', name: 'Corrèze' },
  { code: '21', name: 'Côte-d\'Or' },
  { code: '22', name: 'Côtes-d\'Armor' },
  { code: '23', name: 'Creuse' },
  { code: '24', name: 'Dordogne' },
  { code: '25', name: 'Doubs' },
  { code: '26', name: 'Drôme' },
  { code: '27', name: 'Eure' },
  { code: '28', name: 'Eure-et-Loir' },
  { code: '29', name: 'Finistère' },
  { code: '30', name: 'Gard' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '32', name: 'Gers' },
  { code: '33', name: 'Gironde' },
  { code: '34', name: 'Hérault' },
  { code: '35', name: 'Ille-et-Vilaine' },
  { code: '36', name: 'Indre' },
  { code: '37', name: 'Indre-et-Loire' },
  { code: '38', name: 'Isère' },
  { code: '39', name: 'Jura' },
  { code: '40', name: 'Landes' },
  { code: '41', name: 'Loir-et-Cher' },
  { code: '42', name: 'Loire' },
  { code: '43', name: 'Haute-Loire' },
  { code: '44', name: 'Loire-Atlantique' },
  { code: '45', name: 'Loiret' },
  { code: '46', name: 'Lot' },
  { code: '47', name: 'Lot-et-Garonne' },
  { code: '48', name: 'Lozère' },
  { code: '49', name: 'Maine-et-Loire' },
  { code: '50', name: 'Manche' },
  { code: '51', name: 'Marne' },
  { code: '52', name: 'Haute-Marne' },
  { code: '53', name: 'Mayenne' },
  { code: '54', name: 'Meurthe-et-Moselle' },
  { code: '55', name: 'Meuse' },
  { code: '56', name: 'Morbihan' },
  { code: '57', name: 'Moselle' },
  { code: '58', name: 'Nièvre' },
  { code: '59', name: 'Nord' },
  { code: '60', name: 'Oise' },
  { code: '61', name: 'Orne' },
  { code: '62', name: 'Pas-de-Calais' },
  { code: '63', name: 'Puy-de-Dôme' },
  { code: '64', name: 'Pyrénées-Atlantiques' },
  { code: '65', name: 'Hautes-Pyrénées' },
  { code: '66', name: 'Pyrénées-Orientales' },
  { code: '67', name: 'Bas-Rhin' },
  { code: '68', name: 'Haut-Rhin' },
  { code: '69', name: 'Rhône' },
  { code: '70', name: 'Haute-Saône' },
  { code: '71', name: 'Saône-et-Loire' },
  { code: '72', name: 'Sarthe' },
  { code: '73', name: 'Savoie' },
  { code: '74', name: 'Haute-Savoie' },
  { code: '75', name: 'Paris' },
  { code: '76', name: 'Seine-Maritime' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '79', name: 'Deux-Sèvres' },
  { code: '80', name: 'Somme' },
  { code: '81', name: 'Tarn' },
  { code: '82', name: 'Tarn-et-Garonne' },
  { code: '83', name: 'Var' },
  { code: '84', name: 'Vaucluse' },
  { code: '85', name: 'Vendée' },
  { code: '86', name: 'Vienne' },
  { code: '87', name: 'Haute-Vienne' },
  { code: '88', name: 'Vosges' },
  { code: '89', name: 'Yonne' },
  { code: '90', name: 'Territoire de Belfort' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: 'Val-d\'Oise' },
];

const AVATAR_TYPES = [
  { id: 'explorer', emoji: '🧑‍🚀' },
  { id: 'scientist', emoji: '👩‍🔬' },
  { id: 'artist', emoji: '🎨' },
  { id: 'athlete', emoji: '⚽' },
  { id: 'wizard', emoji: '🧙' },
  { id: 'hero', emoji: '🦸' },
];

type AddChildModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (childId?: string) => void;
  existingChildrenCount?: number;
  maxChildren?: number;
  planType?: string;
};

export function AddChildModal({ isOpen, onClose, onSuccess, existingChildrenCount = 0, maxChildren = 4, planType = 'premium' }: AddChildModalProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(6);
  const [avatar, setAvatar] = useState('explorer');
  const [gradeLevel, setGradeLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedNewPrice, setAcceptedNewPrice] = useState(false);
  const [showPriceConfirmation, setShowPriceConfirmation] = useState(false);

  if (!isOpen) return null;

  async function handleInitialSubmit() {
    // Valider d'abord les champs du formulaire
    if (!name.trim()) {
      setError('Entre le nom de l\'enfant');
      return;
    }
    if (!age || age < 3 || age > 18) {
      setError('Entre un âge valide (3-18 ans)');
      return;
    }
    if (!gradeLevel) {
      setError('Choisis le niveau scolaire');
      return;
    }

    // Réinitialiser l'erreur si les validations passent
    setError(null);

    // Show price confirmation if:
    // 1. Premium plan : au-delà de 4 enfants (base = 4)
    // 2. Liberté plan : au-delà de 5 enfants (base = 5)
    const isPremiumPlan = planType === 'premium' || maxChildren === 4;
    const isLibertePlan = planType === 'liberte';

    const needsConfirmation =
      (isPremiumPlan && existingChildrenCount >= 4) ||
      (isLibertePlan && existingChildrenCount >= 5);

    if (needsConfirmation) {
      setShowPriceConfirmation(true);
      return;
    }

    // Otherwise proceed directly
    await handleFinalSubmit();
  }

  async function handleFinalSubmit() {
    // Les validations ont déjà été faites dans handleInitialSubmit
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-child-profile`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          age,
          avatar,
          gradeLevel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create child profile');
      }

      const result = await response.json();
      const childId = result.childId;

      // Send notification email about subscription update if adding beyond base capacity
      const isPremiumPlan = planType === 'premium' || maxChildren === 4;
      const isLibertePlan = planType === 'liberte';
      const baseChildren = isLibertePlan ? 5 : 4;
      const isAddingBeyondBase = (isPremiumPlan || isLibertePlan) && existingChildrenCount >= baseChildren;

      if (isAddingBeyondBase) {
        const extraChildren = (existingChildrenCount + 1) - baseChildren;
        const basePrice = 8; // Prix de base
        const newMonthlyPrice = basePrice + (extraChildren * 2);

        const apiUrlEmail = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-update-email`;
        await fetch(apiUrlEmail, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newChildrenCount: existingChildrenCount + 1,
            newMonthlyPrice
          }),
        });
      }

      setName('');
      setAge(6);
      setAvatar('explorer');
      setGradeLevel('');
      setAcceptedNewPrice(false);
      setShowPriceConfirmation(false);
      onSuccess(childId);
      onClose();
    } catch (err: any) {
      console.error('Error adding child:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  // Price confirmation modal
  if (showPriceConfirmation) {
    const newChildrenCount = existingChildrenCount + 1;
    const isLibertePlan = planType === 'liberte';
    const planName = isLibertePlan ? 'Liberté' : 'Premium';

    // Pour Plan Liberté : base 5 enfants à 8€, au-delà +2€/enfant
    // Pour Plan Premium : base 4 enfants à 8€, au-delà +2€/enfant
    const baseChildren = isLibertePlan ? 5 : 4;
    const basePrice = 8;

    const extraChildren = Math.max(0, newChildrenCount - baseChildren);
    const oldExtraChildren = Math.max(0, existingChildrenCount - baseChildren);
    const oldMonthlyPrice = basePrice + (oldExtraChildren * 2);
    const newMonthlyPrice = basePrice + (extraChildren * 2);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-4 rounded-t-2xl">
            <h2 className="text-xl font-bold">⚡ Nouveau tarif - Plan {planName}</h2>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
              <p className="text-gray-700 mb-4 font-semibold">
                {existingChildrenCount === 4
                  ? `Vous ajoutez votre 5ème enfant :`
                  : `Vous ajoutez votre ${newChildrenCount}ème enfant :`
                }
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Plan {planName} : Base {baseChildren} enfants à 8€/mois + 2€ par enfant supplémentaire
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Enfants :</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-500 line-through">{existingChildrenCount}</span>
                    <span className="text-blue-600 font-bold text-xl">{newChildrenCount}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tarif mensuel :</span>
                  <div className="flex items-center gap-2">
                    {existingChildrenCount === 4 ? (
                      <span className="font-semibold text-gray-500 line-through">{oldMonthlyPrice}€/mois</span>
                    ) : (
                      <span className="font-semibold text-gray-500 line-through">{oldMonthlyPrice}€/mois</span>
                    )}
                    <span className="text-blue-600 font-bold text-xl">{newMonthlyPrice}€/mois</span>
                  </div>
                </div>
                <div className="text-sm bg-white rounded-lg p-3 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan de base ({baseChildren} enfants) :</span>
                    <span className="font-semibold">8€/mois</span>
                  </div>
                  {extraChildren > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>+ {extraChildren} enfant{extraChildren > 1 ? 's' : ''} x 2€ :</span>
                      <span className="font-semibold">+{extraChildren * 2}€/mois</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-lg">
                    <span>Total :</span>
                    <span className="text-blue-600">{newMonthlyPrice}€/mois</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className={`flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition hover:bg-gray-50 ${acceptedNewPrice ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={acceptedNewPrice}
                  onChange={(e) => setAcceptedNewPrice(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  J'accepte le nouveau tarif de <strong>{newMonthlyPrice}€/mois</strong> pour {newChildrenCount} enfants.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPriceConfirmation(false);
                  setAcceptedNewPrice(false);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={!acceptedNewPrice || loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl transition"
              >
                {loading ? 'Ajout...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Ajouter un enfant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'enfant</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Emma"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Âge</label>
            <input
              type="number"
              min="3"
              max="18"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 6)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Avatar</label>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATAR_TYPES.map((avatarType) => (
                <button
                  key={avatarType.id}
                  onClick={() => setAvatar(avatarType.id)}
                  className={`p-2 rounded-lg border-2 transition ${
                    avatar === avatarType.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="text-2xl">{avatarType.emoji}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau scolaire</label>
            <div className="grid grid-cols-5 gap-1.5">
              {GRADE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setGradeLevel(level)}
                  className={`py-1.5 px-2 rounded-lg border-2 font-semibold text-sm transition ${
                    gradeLevel === level
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleInitialSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50"
          >
            {loading ? (
              'Ajout...'
            ) : (
              <>
                <UserPlus size={18} />
                Ajouter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
