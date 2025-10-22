import { useState, useEffect } from 'react';
import { Check, Crown, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

type Plan = {
  id: string;
  name: string;
  maxChildren: number;
  pricePerMonth: number;
  features: string[];
  recommended?: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basique',
    maxChildren: 1,
    pricePerMonth: 2,
    features: [
      '1 enfant',
      'Tous les cours et exercices',
      'Suivi de progression',
      'Mode bataille',
      'Réseau social sécurisé'
    ]
  },
  {
    id: 'duo',
    name: 'Duo',
    maxChildren: 2,
    pricePerMonth: 3,
    features: [
      'Jusqu\'à 2 enfants',
      'Tous les cours et exercices',
      'Suivi de progression détaillé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Économie de 25% par enfant'
    ],
    recommended: true,
    badge: 'Le plus populaire'
  },
  {
    id: 'family',
    name: 'Famille',
    maxChildren: 3,
    pricePerMonth: 5,
    features: [
      'Jusqu\'à 3 enfants',
      'Tous les cours et exercices',
      'Suivi de progression avancé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Économie de 17% par enfant'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    maxChildren: 4,
    pricePerMonth: 6,
    features: [
      'Jusqu\'à 4 enfants',
      'Tous les cours et exercices',
      'Suivi de progression avancé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Support prioritaire',
      'Économie de 25% par enfant'
    ],
    badge: 'Meilleure offre'
  },
  {
    id: 'liberte',
    name: 'Liberté',
    maxChildren: 999,
    pricePerMonth: 8,
    features: [
      'Jusqu\'à 5 enfants inclus',
      '+2€ par enfant supplémentaire',
      'Tous les cours et exercices',
      'Suivi de progression avancé',
      'Mode bataille',
      'Réseau social sécurisé',
      'Support prioritaire VIP'
    ],
    badge: 'Maximum de flexibilité'
  }
];

const BASE_PLAN_PRICES: Record<string, number> = {
  basic: 2,
  duo: 3,
  family: 5,
  premium: 6,
  liberte: 8
};

const computePlanPrice = (plan: Plan, childrenCount: number): number => {
  if (plan.id === 'liberte') {
    const billedChildren = Math.max(childrenCount, 5);
    return BASE_PLAN_PRICES.liberte + Math.max(billedChildren - 5, 0) * 2;
  }

  return BASE_PLAN_PRICES[plan.id] ?? plan.pricePerMonth;
};

const getBillingChildrenCount = (plan: Plan, actualChildrenCount: number): number => {
  if (plan.id === 'liberte') {
    return Math.max(actualChildrenCount, 5);
  }

  return Math.max(plan.maxChildren, 1);
};

const formatPlanCapacity = (plan: Plan): string => {
  if (plan.id === 'liberte') {
    return "Jusqu'à 5 enfants (+2€/enfant supplémentaire)";
  }

  if (plan.maxChildren === 1) {
    return '1 enfant';
  }

  return `Jusqu'à ${plan.maxChildren} enfants`;
};

type UpgradePlansPageProps = {
  currentChildrenCount: number;
  onCancel: () => void;
  onSuccess?: () => void;
};

export function UpgradePlansPage({ currentChildrenCount, onCancel, onSuccess }: UpgradePlansPageProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>(PLANS[0]);
  const [subscription, setSubscription] = useState<any>(null);

  const recordedChildrenCount = subscription?.children_count ?? 0;
  const effectiveChildrenCount = Math.max(currentChildrenCount, recordedChildrenCount, 1);
  const billedCurrentChildren = getBillingChildrenCount(currentPlan, effectiveChildrenCount);
  const currentPlanPrice = computePlanPrice(currentPlan, billedCurrentChildren);
  const billedSelectedChildren = selectedPlan ? getBillingChildrenCount(selectedPlan, effectiveChildrenCount) : null;
  const selectedPlanPrice = selectedPlan && billedSelectedChildren !== null
    ? computePlanPrice(selectedPlan, billedSelectedChildren)
    : null;

  useEffect(() => {
    async function loadSubscription() {
      if (!user) return;

      const parentId = profile?.role === 'child' && profile?.parent_id
        ? profile.parent_id
        : user?.id;

      if (!parentId) return;

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', parentId)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
        // Trouver le plan actuel basé sur plan_type dans la DB
        const actualCurrentPlan = PLANS.find(p => p.id === subData.plan_type) || PLANS[0];
        setCurrentPlan(actualCurrentPlan);

        // Recommander un plan supérieur si nécessaire
        const recommendedPlan = PLANS.find(p => p.maxChildren > actualCurrentPlan.maxChildren);
        if (recommendedPlan) {
          setSelectedPlan(recommendedPlan);
        }
      }
    }

    loadSubscription();
  }, [user, profile, currentChildrenCount]);

  async function handleUpgrade() {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      const parentId = profile?.role === 'child' && profile?.parent_id
        ? profile.parent_id
        : user?.id;

      if (!parentId) {
        throw new Error('Parent ID not found');
      }

      if (!subscription) {
        throw new Error('Aucun abonnement trouvé');
      }

      const recordedChildrenCount = subscription.children_count ?? 0;
      const actualChildrenCount = Math.max(currentChildrenCount, recordedChildrenCount, 1);
      const billedCurrentChildren = getBillingChildrenCount(currentPlan, actualChildrenCount);
      const billedSelectedChildren = getBillingChildrenCount(selectedPlan, actualChildrenCount);
      const oldPrice = computePlanPrice(currentPlan, billedCurrentChildren);
      const newPrice = computePlanPrice(selectedPlan, billedSelectedChildren);
      const newChildrenCount = billedSelectedChildren;

      const isReactivation = selectedPlan.id === currentPlan.id && subscription.status === 'cancelled';
      const isUpgrade = !isReactivation && (newChildrenCount > billedCurrentChildren || newPrice > oldPrice);
      const isDowngrade = !isReactivation && !isUpgrade && (newChildrenCount < billedCurrentChildren || newPrice < oldPrice);
      const historyAction = isReactivation ? 'reactivated' : 'updated';

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          children_count: newChildrenCount,
          plan_type: selectedPlan.id,
          status: 'active'
        })
        .eq('user_id', parentId);

      if (updateError) throw updateError;

      await supabase
        .from('subscription_history')
        .insert({
          user_id: parentId,
          children_count: newChildrenCount,
          price: newPrice,
          plan_type: selectedPlan.id,
          action_type: historyAction,
          notes: isReactivation
            ? `Réactivation du plan ${selectedPlan.name} (${newPrice}€/mois)`
            : `Passage de ${currentPlan.name} (${oldPrice}€/mois) à ${selectedPlan.name} (${newPrice}€/mois)`
        });

      try {
        const recipientEmail = profile?.email || user?.email;
        const parentName = profile?.full_name || 'Parent';

        if (recipientEmail) {
          let template = 'subscription_upgraded';
          let subject = '✨ Abonnement mis à jour - PioPi';

          if (isReactivation) {
            template = 'subscription_upgraded';
            subject = '🎉 Abonnement réactivé - PioPi';
          } else if (isDowngrade) {
            template = 'subscription_downgraded';
            subject = '📊 Abonnement modifié - PioPi';
          }

          const trialEndDate = new Date(subscription.trial_end_date);
          const nextBillingDate = subscription.status === 'trial'
            ? trialEndDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });

          const emailUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
          const emailResponse = await fetch(emailUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: recipientEmail,
              subject: subject,
              template: template,
              data: {
                parentName: parentName,
                oldChildrenCount: billedCurrentChildren,
                newChildrenCount: newChildrenCount,
                oldPrice: oldPrice,
                newPrice: newPrice,
                nextBillingDate: nextBillingDate
              }
            })
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Failed to send email:', errorText);
          }
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      showToast(isReactivation ? 'Abonnement réactivé avec succès !' : 'Abonnement mis à jour avec succès !', 'success');

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      showToast(error.message || 'Erreur lors de la mise à jour', 'error');
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming && selectedPlan) {
    const nextPlanPrice = selectedPlanPrice ?? computePlanPrice(
      selectedPlan,
      getBillingChildrenCount(selectedPlan, effectiveChildrenCount)
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setConfirming(false)}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2 font-medium"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
                <Crown className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Confirmer le changement</h2>
              <p className="text-gray-600">Vérifiez les détails de votre nouveau plan</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Plan actuel</p>
                  <p className="text-xl font-bold text-gray-800">{currentPlan.name}</p>
                  <p className="text-sm text-gray-600">{currentPlanPrice}€/mois</p>
                </div>
                <div className="text-3xl">→</div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nouveau plan</p>
                  <p className="text-xl font-bold text-blue-600">{selectedPlan.name}</p>
                  <p className="text-sm text-gray-600">{nextPlanPrice}€/mois</p>
                </div>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-3">Ce qui change :</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Capacité : {formatPlanCapacity(currentPlan)} → {formatPlanCapacity(selectedPlan)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Tarif : {currentPlanPrice}€/mois → {nextPlanPrice}€/mois
                    </span>
                  </li>
                </ul>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>Le changement sera effectif immédiatement.</p>
                <p className="mt-1">Votre prochain paiement sera de <strong>{nextPlanPrice}€</strong>.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:border-gray-400 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Mise à jour...' : 'Confirmer le changement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onCancel}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2 font-medium"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Vous avez actuellement <strong>{currentChildrenCount} enfant(s)</strong> avec le plan <strong>{currentPlan.name}</strong>.
            <br />
            Sélectionnez un plan adapté à vos besoins.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan.id;
            const isActivePlan = isCurrentPlan && subscription?.status === 'active';
            const isCancelledPlan = isCurrentPlan && subscription?.status === 'cancelled';
            const isTooSmall = plan.maxChildren < currentChildrenCount && plan.maxChildren !== 999;
            const isSelected = selectedPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => !isTooSmall && setSelectedPlan(plan)}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all cursor-pointer ${
                  isTooSmall
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'ring-4 ring-blue-500 scale-105'
                    : 'hover:shadow-xl hover:scale-105'
                } ${plan.recommended ? 'border-2 border-blue-500' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-bl-xl">
                    {plan.badge}
                  </div>
                )}

                {isActivePlan && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Plan actuel
                  </div>
                )}

                {isCancelledPlan && (
                  <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Abonnement annulé
                  </div>
                )}

                <div className="p-6 pt-12">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">{plan.name}</h3>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-gray-800">{plan.pricePerMonth}€</span>
                      <span className="text-gray-600">/mois</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPlanCapacity(plan)}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isTooSmall && (
                    <div className="text-center text-sm text-red-600 font-semibold mb-4">
                      Capacité insuffisante
                    </div>
                  )}

                  <button
                    disabled={isTooSmall || isActivePlan}
                    className={`w-full py-3 rounded-xl font-bold transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : isActivePlan
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isCancelledPlan
                        ? 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                        : isTooSmall
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {isActivePlan ? 'Plan actuel' : isCancelledPlan ? (isSelected ? 'Sélectionné' : 'Réactiver') : isSelected ? 'Sélectionné' : 'Sélectionner'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedPlan && (selectedPlan.id !== currentPlan.id || subscription?.status === 'cancelled') && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setConfirming(true)}
              className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl transition shadow-xl"
            >
              {selectedPlan.id === currentPlan.id && subscription?.status === 'cancelled'
                ? `Réactiver ${selectedPlan.name} - ${selectedPlanPrice ?? selectedPlan.pricePerMonth}€/mois`
                : `Continuer avec ${selectedPlan.name} - ${selectedPlanPrice ?? selectedPlan.pricePerMonth}€/mois`}
            </button>
          </div>
        )}

        <div className="mt-12 max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={28} className="text-blue-600" />
            Questions fréquentes
          </h3>
          <div className="space-y-4 text-gray-600">
            <div>
              <p className="font-semibold text-gray-800 mb-1">Puis-je changer de plan à tout moment ?</p>
              <p>Oui, vous pouvez changer de plan à tout moment. Le changement est effectif immédiatement.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Que se passe-t-il si je réduis mon plan ?</p>
              <p>Vous devrez d'abord supprimer des profils d'enfants pour respecter la limite du nouveau plan.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Y a-t-il un engagement ?</p>
              <p>Non, tous nos plans sont sans engagement. Vous pouvez annuler à tout moment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
