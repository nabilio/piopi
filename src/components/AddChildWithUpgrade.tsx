import { useState, useEffect } from 'react';
import { ArrowLeft, Baby, CreditCard, Check, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UpgradePlansPage } from './UpgradePlansPage';
import { AddChildModal } from './AddChildModal';

type AddChildWithUpgradeProps = {
  onBack: () => void;
  onSuccess: () => void;
};

export function AddChildWithUpgrade({ onBack, onSuccess }: AddChildWithUpgradeProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newChildData, setNewChildData] = useState({
    full_name: '',
    age: '',
    grade_level: '',
  });
  const [showUpgradeConfirmation, setShowUpgradeConfirmation] = useState(false);
  const [showPlansPage, setShowPlansPage] = useState(false);
  const [agreedToUpgrade, setAgreedToUpgrade] = useState(false);
  const [upgradeCompleted, setUpgradeCompleted] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);


  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: childrenData } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', user.id);

    setSubscription(subData);
    setChildren(childrenData || []);
    setLoading(false);
  }

  const currentChildrenCount = children.length;
  const currentMaxChildren = subscription?.children_count || 1;
  const planType = subscription?.plan_type || 'basic';
  const isLibertePlan = planType === 'liberte';

  // Pour le plan Liberté : Base 4 enfants (prix premium 8€) + 2€ par enfant supplémentaire
  const willExceedLimit = isLibertePlan
    ? false // Plan Liberté n'a pas de limite
    : currentChildrenCount >= currentMaxChildren;

  const newChildrenCount = currentChildrenCount + 1;

  // Calcul du prix
  const calculatePrice = (childCount: number, plan: string) => {
    if (plan === 'liberte') {
      // Base : 8€ pour 4 enfants + 2€ par enfant supplémentaire
      return childCount <= 4 ? 8 : 8 + (childCount - 4) * 2;
    }
    return childCount * 2;
  };

  const currentPrice = calculatePrice(subscription?.children_count || 1, planType);
  const newPrice = calculatePrice(newChildrenCount, planType);

  // Si on a un plan Liberté et qu'on dépasse 4 enfants, il faut afficher la confirmation de tarif
  const needsPriceConfirmation = isLibertePlan && currentChildrenCount >= 4 && !agreedToUpgrade;

  console.log('AddChildWithUpgrade:', {
    currentChildrenCount,
    currentMaxChildren,
    willExceedLimit,
    agreedToUpgrade
  });

  async function handleAddChild() {
    if (!user || !newChildData.full_name || !newChildData.age || !newChildData.grade_level) {
      return;
    }

    // Si on dépasse la limite et qu'on n'a pas encore confirmé, montrer la page de sélection de plans
    if (willExceedLimit && !agreedToUpgrade) {
      setShowPlansPage(true);
      return;
    }

    // Pour le Plan Liberté : afficher confirmation du nouveau tarif au-delà de 4 enfants
    if (needsPriceConfirmation) {
      setShowUpgradeConfirmation(true);
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-child-profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newChildData.full_name,
            age: parseInt(newChildData.age),
            gradeLevel: newChildData.grade_level,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du profil enfant');
      }

      // Mettre à jour l'abonnement si nécessaire (willExceedLimit OU needsPriceConfirmation pour Liberté)
      if (willExceedLimit || (isLibertePlan && currentChildrenCount >= 4)) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ children_count: newChildrenCount })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        await supabase
          .from('subscription_history')
          .insert({
            user_id: user.id,
            children_count: newChildrenCount,
            price: newPrice,
            plan_type: subscription.plan_type,
            action_type: 'upgrade',
            notes: isLibertePlan
              ? `Plan Liberté : Passage de ${currentChildrenCount} à ${newChildrenCount} enfants (${currentPrice}€ → ${newPrice}€)`
              : `Passage de ${currentMaxChildren} à ${newChildrenCount} enfants`
          });

        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-update-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              oldChildrenCount: currentMaxChildren,
              newChildrenCount: newChildrenCount,
              oldPrice: currentPrice,
              newPrice: newPrice,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send update email:', emailError);
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si on dépasse la limite, afficher directement la page de sélection de plans
  if (willExceedLimit && !agreedToUpgrade && !upgradeCompleted) {
    console.log('Showing UpgradePlansPage because willExceedLimit && !agreedToUpgrade');
    return (
      <UpgradePlansPage
        currentChildrenCount={currentChildrenCount}
        onCancel={onBack}
        onSuccess={async () => {
          console.log('UpgradePlansPage onSuccess called');
          // Marquer l'upgrade comme complété
          setUpgradeCompleted(true);
          // Recharger les données de l'abonnement
          await loadData();
          console.log('Data reloaded after upgrade');
        }}
      />
    );
  }

  // Afficher la confirmation après l'upgrade
  if (upgradeCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Upgrade confirmé !
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Votre abonnement a été mis à jour avec succès. Vous pouvez maintenant ajouter plus d'enfants à votre compte.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition"
              >
                Retour à l'accueil
              </button>

              <button
                onClick={() => setShowAddChildModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition flex items-center gap-2 justify-center"
              >
                <Baby size={20} />
                Ajouter un enfant
              </button>
            </div>
          </div>
        </div>

        <AddChildModal
          isOpen={showAddChildModal}
          onClose={() => setShowAddChildModal(false)}
          onSuccess={() => {
            setShowAddChildModal(false);
            onSuccess();
          }}
        />
      </div>
    );
  }

  // Page de sélection de plans (pour le flux manuel)
  if (showPlansPage) {
    return (
      <UpgradePlansPage
        currentChildrenCount={currentChildrenCount}
        onCancel={() => setShowPlansPage(false)}
        onSuccess={() => {
          setShowPlansPage(false);
          setAgreedToUpgrade(true);
          handleAddChild();
        }}
      />
    );
  }

  // Page de confirmation d'upgrade (ancienne version, gardée pour référence)
  if (showUpgradeConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => {
              setShowUpgradeConfirmation(false);
              setAgreedToUpgrade(false);
            }}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
                <TrendingUp size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                {isLibertePlan ? 'Nouveau tarif Plan Liberté' : 'Mise à jour de votre abonnement'}
              </h1>
              <p className="text-gray-600 text-lg">
                {isLibertePlan
                  ? `Au-delà de 4 enfants : +2€ par enfant supplémentaire`
                  : 'Confirmation requise'
                }
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="text-gray-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Abonnement actuel</p>
                      <p className="text-xs text-gray-500">Formule en cours</p>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-4xl font-black text-gray-800 mb-2">{currentPrice}€</p>
                    <p className="text-sm text-gray-600">par mois</p>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-2xl font-bold text-gray-800">{currentMaxChildren}</p>
                      <p className="text-sm text-gray-600">enfant{currentMaxChildren > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-green-500 shadow-lg relative">
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    NOUVELLE FORMULE
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-green-800 font-semibold">Nouvel abonnement</p>
                      <p className="text-xs text-green-600">Après ajout de l'enfant</p>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-4xl font-black text-green-600 mb-2">{newPrice}€</p>
                    <p className="text-sm text-gray-600">par mois</p>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-2xl font-bold text-green-600">{newChildrenCount}</p>
                      <p className="text-sm text-gray-600">enfants</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 border-2 border-blue-300 rounded-xl p-4 mt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-blue-900">Différence de prix</p>
                    <p className="text-blue-800">+{newPrice - currentPrice}€ par mois</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 text-lg">Informations importantes :</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                  <span>Vous aurez actuellement <strong>{currentChildrenCount} profil(s)</strong> d'enfant(s)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                  <span>L'ajout de cet enfant portera votre abonnement à <strong>{newChildrenCount} enfants</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                  <span>Votre nouveau tarif sera de <strong>{newPrice}€/mois</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                  <span>La facturation sera mise à jour automatiquement à partir du prochain cycle</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToUpgrade}
                  onChange={(e) => setAgreedToUpgrade(e.target.checked)}
                  className="mt-1 w-6 h-6 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <span className="text-gray-800 flex-1 leading-relaxed">
                  Je confirme avoir pris connaissance de la nouvelle formule d'abonnement et j'accepte la mise à jour de mon abonnement de <strong>{currentMaxChildren} à {newChildrenCount} enfants</strong> pour <strong>{newPrice}€/mois</strong>.
                </span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowUpgradeConfirmation(false);
                  setAgreedToUpgrade(false);
                }}
                disabled={saving}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition text-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleAddChild}
                disabled={!agreedToUpgrade || saving}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-4 rounded-xl transition text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Valider et ajouter l'enfant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-green-400 to-teal-400 rounded-full flex items-center justify-center shadow-lg">
              <Baby size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Ajouter un enfant</h1>
          </div>

          {willExceedLimit && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> Vous utilisez actuellement {currentChildrenCount}/{currentMaxChildren} profils.
                L'ajout de cet enfant nécessitera une mise à jour de votre abonnement.
              </p>
            </div>
          )}

          <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={newChildData.full_name}
                  onChange={(e) => setNewChildData({ ...newChildData, full_name: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                  placeholder="Ex: Marie Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Âge
                </label>
                <input
                  type="number"
                  value={newChildData.age}
                  onChange={(e) => setNewChildData({ ...newChildData, age: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                  placeholder="Ex: 8"
                  min="5"
                  max="18"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Niveau scolaire
                </label>
                <select
                  value={newChildData.grade_level}
                  onChange={(e) => setNewChildData({ ...newChildData, grade_level: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                >
                  <option value="">Sélectionnez un niveau</option>
                  <option value="CP">CP</option>
                  <option value="CE1">CE1</option>
                  <option value="CE2">CE2</option>
                  <option value="CM1">CM1</option>
                  <option value="CM2">CM2</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAddChild}
                  disabled={!newChildData.full_name || !newChildData.age || !newChildData.grade_level || saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-4 rounded-xl transition text-lg shadow-lg hover:shadow-xl"
                >
                  {saving ? 'Ajout en cours...' : 'Continuer'}
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition text-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
