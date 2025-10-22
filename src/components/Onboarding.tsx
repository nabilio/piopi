import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowRight, ArrowLeft, User, Sparkles, GraduationCap, MapPin, UserPlus, Trash2 } from 'lucide-react';

type OnboardingStep = 'children-setup';

interface ChildData {
  name: string;
  age: number;
  avatar: string;
  gradeLevel: string;
  department: string;
}

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
  { id: 'explorer', name: 'Explorateur', emoji: '🧑‍🚀' },
  { id: 'scientist', name: 'Scientifique', emoji: '👩‍🔬' },
  { id: 'artist', name: 'Artiste', emoji: '🎨' },
  { id: 'athlete', name: 'Athlète', emoji: '⚽' },
  { id: 'wizard', name: 'Magicien', emoji: '🧙' },
  { id: 'hero', name: 'Super-héros', emoji: '🦸' },
];

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('children-setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [editingChild, setEditingChild] = useState<ChildData>({
    name: '',
    age: 6,
    avatar: 'explorer',
    gradeLevel: '',
    department: '',
  });

  function handleAddChild() {
    if (!editingChild.name.trim()) {
      setError('Entre le nom de l\'enfant');
      return;
    }
    if (!editingChild.age || editingChild.age < 3 || editingChild.age > 18) {
      setError('Entre un âge valide (3-18 ans)');
      return;
    }
    if (!editingChild.gradeLevel) {
      setError('Choisis le niveau scolaire');
      return;
    }
    if (!editingChild.department) {
      setError('Choisis le département');
      return;
    }

    setChildren([...children, editingChild]);
    setEditingChild({
      name: '',
      age: 6,
      avatar: 'explorer',
      gradeLevel: '',
      department: '',
    });
    setError(null);
  }

  function handleRemoveChild(index: number) {
    setChildren(children.filter((_, i) => i !== index));
  }


  async function skipOnboarding() {
    if (!user) return;

    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          role: 'parent',
          onboarding_completed: true,
        })
        .eq('id', user.id);

      await refreshProfile();
      onComplete();
    } catch (err: any) {
      console.error('Error skipping onboarding:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    if (!user) return;

    if (children.length === 0) {
      setError('Ajoute au moins un enfant ou clique sur "Passer"');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'parent',
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      for (const child of children) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-child-profile`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: child.name,
            age: child.age,
            avatar: child.avatar,
            gradeLevel: child.gradeLevel,
            department: child.department,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create child profile');
        }
      }

      await refreshProfile();
      onComplete();
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-teal-500 to-green-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">Bienvenue !</h1>
          <p className="text-gray-600 text-center">Ajoutez les profils de vos enfants</p>
        </div>

        {currentStep === 'children-setup' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Ajouter des comptes enfants
            </h2>

            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'enfant</label>
                  <input
                    type="text"
                    value={editingChild.name}
                    onChange={(e) => setEditingChild({ ...editingChild, name: e.target.value })}
                    placeholder="Ex: Emma"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Âge</label>
                  <input
                    type="number"
                    min="3"
                    max="18"
                    value={editingChild.age}
                    onChange={(e) => setEditingChild({ ...editingChild, age: parseInt(e.target.value) || 6 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {AVATAR_TYPES.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setEditingChild({ ...editingChild, avatar: avatar.id })}
                      className={`p-3 rounded-xl border-2 transition ${
                        editingChild.avatar === avatar.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="text-3xl">{avatar.emoji}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau scolaire</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {GRADE_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setEditingChild({ ...editingChild, gradeLevel: level })}
                      className={`py-2 px-2 rounded-lg border-2 font-semibold transition ${
                        editingChild.gradeLevel === level
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                <select
                  value={editingChild.department}
                  onChange={(e) => setEditingChild({ ...editingChild, department: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Sélectionne un département</option>
                  {FRENCH_DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={`${dept.code} - ${dept.name}`}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddChild}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition"
              >
                <UserPlus size={20} />
                Ajouter cet enfant
              </button>
            </div>

            {children.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Enfants ajoutés ({children.length})</h3>
                <div className="space-y-2">
                  {children.map((child, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{AVATAR_TYPES.find(a => a.id === child.avatar)?.emoji}</span>
                        <div>
                          <div className="font-semibold text-gray-800">{child.name} ({child.age} ans)</div>
                          <div className="text-sm text-gray-600">{child.gradeLevel} - {child.department}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveChild(index)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={skipOnboarding}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 rounded-2xl transition disabled:opacity-50"
          >
            Passer
          </button>
          <button
            onClick={completeOnboarding}
            disabled={loading || children.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-bold py-4 rounded-2xl transition disabled:opacity-50"
          >
            {loading ? (
              'Chargement...'
            ) : (
              <>
                Terminer
                <Sparkles size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
