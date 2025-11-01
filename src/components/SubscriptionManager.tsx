import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Users, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { PlanSelection } from './PlanSelection';

type Subscription = {
  id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  children_count: number;
  plan_type: string;
};

type SubscriptionHistory = {
  id: string;
  action_type: string;
  action_date: string;
  children_count: number;
  price: number;
  notes: string | null;
};

type SubscriptionManagerProps = {
  onUpgrade?: () => void;
};

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps = {}) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actualChildrenCount, setActualChildrenCount] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadSubscription();
    }
  }, [user, profile]);

  async function loadSubscription() {
    try {
      const parentId = profile?.role === 'child' && profile?.parent_id
        ? profile.parent_id
        : user?.id;

      if (!parentId) {
        console.log('No parent ID found in SubscriptionManager', { user: user?.id, profile: profile?.id, role: profile?.role });
        setLoading(false);
        return;
      }

      console.log('Loading subscription for parent:', parentId);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', parentId)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
      }

      console.log('Subscription data:', data);

      if (data) {
        setSubscription(data);
        calculateDaysRemaining(data);

        // Load actual children count
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', parentId)
          .eq('role', 'child');

        setActualChildrenCount(count || 0);

        // Warn if plan_type doesn't match children_count
        const expectedPlanType = count === 1 ? 'basic' : count === 2 ? 'duo' : count === 3 ? 'family' : count === 4 ? 'premium' : count && count >= 5 ? 'liberte' : 'unknown';
        if (data.plan_type !== expectedPlanType && count && count <= 4) {
          console.warn(`⚠️ Subscription plan mismatch detected!
  - Database plan_type: ${data.plan_type}
  - Expected plan_type based on ${count} children: ${expectedPlanType}
  - children_count in subscription: ${data.children_count}

  This may cause incorrect display. Please run the FIX_SUBSCRIPTION_PLAN_TYPE.sql migration.`);
        }
      } else {
        console.log('No subscription found for user:', parentId);
      }

      // Load subscription history
      const { data: historyData, error: historyError } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', parentId)
        .order('action_date', { ascending: false });

      if (historyError) {
        console.error('Error loading history:', historyError);
      } else {
        setHistory(historyData || []);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateDaysRemaining(sub: Subscription) {
    const endDate = sub.status === 'trial'
      ? new Date(sub.trial_end_date)
      : sub.subscription_end_date
        ? new Date(sub.subscription_end_date)
        : null;

    if (endDate) {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysRemaining(days);
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true);
    setShowCancelDialog(false);
    try {
      const parentId = profile?.role === 'child' && profile?.parent_id
        ? profile.parent_id
        : user?.id;

      if (!parentId) return;

      // Call edge function to cancel subscription and send email
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      // Reload subscription data
      await loadSubscription();

      showToast('Votre abonnement a été annulé avec succès. Un email de confirmation vous a été envoyé.', 'success');
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      showToast(error.message || 'Une erreur est survenue lors de l\'annulation.', 'error');
    } finally {
      setCancelling(false);
    }
  }

  function getActionTypeLabel(actionType: string): string {
    const labels: Record<string, string> = {
      'created': 'Abonnement créé',
      'updated': 'Abonnement modifié',
      'cancelled': 'Abonnement annulé',
      'renewed': 'Abonnement renouvelé',
      'trial_started': 'Essai gratuit démarré',
      'child_added': 'Enfant ajouté',
      'child_removed': 'Enfant retiré'
    };
    return labels[actionType] || actionType;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'trial':
        return (
          <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
            <CheckCircle size={18} />
            Essai gratuit
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
            <CheckCircle size={18} />
            Actif
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold">
            <XCircle size={18} />
            Expiré
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-semibold">
            <XCircle size={18} />
            Annulé
          </span>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <AlertCircle size={48} className="text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Commencez votre essai gratuit</h3>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore d'abonnement actif. Ajoutez vos enfants pour démarrer votre essai gratuit de 30 jours !
          </p>
          <button
            onClick={() => window.location.href = '/#/'}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition"
          >
            Ajouter mes enfants
          </button>
        </div>
      </div>
    );
  }

  const getPlanName = (planType: string): string => {
    const plans: Record<string, string> = {
      'basic': 'Basique',
      'duo': 'Duo',
      'family': 'Famille',
      'premium': 'Premium',
      'liberte': 'Liberté',
      'monthly': 'Mensuel',
      'yearly': 'Annuel'
    };
    return plans[planType] || planType;
  };

  const getMaxChildrenForPlan = (planType: string): number => {
    const planLimits: Record<string, number> = {
      'basic': 1,
      'duo': 2,
      'family': 3,
      'premium': 4,
      'liberte': 999
    };
    return planLimits[planType] || 1;
  };

  const getPlanPrice = (planType: string, childrenCount?: number): number => {
    const prices: Record<string, number> = {
      'basic': 2,
      'duo': 3,
      'family': 5,
      'premium': 6,
      'liberte': 6 + Math.max(0, (childrenCount || 5) - 4) * 2
    };
    return prices[planType] || 2;
  };

  const monthlyPrice = getPlanPrice(subscription.plan_type, actualChildrenCount);
  const maxChildren = getMaxChildrenForPlan(subscription.plan_type);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Mon abonnement</h2>
            <p className="text-gray-600">Gérez votre abonnement PioPi</p>
          </div>
          {getStatusBadge(subscription.status)}
        </div>

        <div className={`bg-gradient-to-br p-6 rounded-xl mb-6 ${
          subscription.status === 'cancelled'
            ? 'from-orange-50 to-orange-100 border-2 border-orange-200'
            : 'from-blue-50 to-purple-50 border-2 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {subscription.status === 'cancelled' ? 'Plan annulé' : 'Votre plan actuel'}
              </p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {getPlanName(subscription.plan_type)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {actualChildrenCount}{maxChildren !== 999 && ` / ${maxChildren}`} enfant{actualChildrenCount > 1 ? 's' : ''} - {monthlyPrice}€/mois
              </p>
            </div>
            {onUpgrade && (
              <button
                onClick={() => onUpgrade()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition shadow-lg"
              >
                {subscription.status === 'cancelled' ? 'Réactiver' : 'Modifier mon plan'}
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Users size={24} className="text-white" />
              </div>
              <span className="text-gray-600 font-medium">Enfants</span>
            </div>
            <p className="text-3xl font-black text-gray-800">
              {actualChildrenCount}{maxChildren !== 999 && ` / ${maxChildren}`}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-500 p-2 rounded-lg">
                <CreditCard size={24} className="text-white" />
              </div>
              <span className="text-gray-600 font-medium">Tarif mensuel</span>
            </div>
            <p className="text-3xl font-black text-gray-800">{monthlyPrice}€</p>
            <p className="text-sm text-gray-600 mt-1">Tarif appliqué à l'ensemble de votre foyer</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-500 p-2 rounded-lg">
                <Calendar size={24} className="text-white" />
              </div>
              <span className="text-gray-600 font-medium">
                {subscription.status === 'trial' ? 'Essai' : 'Abonnement'}
              </span>
            </div>
            <p className="text-3xl font-black text-gray-800">
              {daysRemaining > 0 ? `${daysRemaining}j` : '0j'}
            </p>
            <p className="text-sm text-gray-600 mt-1">restants</p>
          </div>
        </div>

        {subscription.status === 'trial' && daysRemaining > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Essai gratuit en cours</h3>
                <p className="text-blue-800 mb-3">
                  Votre période d'essai gratuit se termine le{' '}
                  <strong>{new Date(subscription.trial_end_date).toLocaleDateString('fr-FR')}</strong>.
                  Profitez de toutes les fonctionnalités sans carte bancaire requise !
                </p>
                <p className="text-blue-700 text-sm">
                  Après l'essai, votre abonnement sera de <strong>{monthlyPrice}€/mois</strong> pour {actualChildrenCount} enfant(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription.status === 'trial' && daysRemaining <= 7 && daysRemaining > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">Votre essai se termine bientôt</h3>
                <p className="text-orange-800 mb-3">
                  Il ne reste que <strong>{daysRemaining} jour(s)</strong> à votre essai gratuit.
                  Ajoutez un moyen de paiement pour continuer à profiter d'PioPi.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription.status === 'cancelled' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <XCircle size={24} className="text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">Abonnement annulé</h3>
                <p className="text-orange-800 mb-3">
                  Votre abonnement a été annulé. Vous pouvez le réactiver à tout moment pour retrouver l'accès complet à la plateforme.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription.status === 'expired' && daysRemaining <= 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <XCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Abonnement expiré</h3>
                <p className="text-red-800 mb-3">
                  Votre abonnement a expiré. L'accès à la plateforme est maintenant limité.
                  Renouvelez votre abonnement pour retrouver l'accès complet.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {subscription.status === 'trial' && (
            <>
              <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg">
                Ajouter un moyen de paiement
              </button>
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
                className="w-full bg-white border-2 border-gray-300 hover:border-red-500 hover:text-red-600 text-gray-700 py-3 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {cancelling ? 'Annulation en cours...' : 'Annuler l\'essai gratuit'}
              </button>
            </>
          )}

          {subscription.status === 'active' && (
            <>
              <button className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg">
                Gérer le paiement
              </button>
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
                className="w-full bg-white border-2 border-gray-300 hover:border-red-500 hover:text-red-600 text-gray-700 py-3 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {cancelling ? 'Annulation en cours...' : 'Annuler l\'abonnement'}
              </button>
            </>
          )}

          {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
            <button
              onClick={() => onUpgrade && onUpgrade()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg"
            >
              Réactiver l'abonnement
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Historique de l'abonnement</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            {showHistory ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showHistory && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun historique disponible</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{getActionTypeLabel(item.action_type)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.children_count} enfant{item.children_count > 1 ? 's' : ''} - {item.price}€/mois
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(item.action_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Informations importantes</h3>
        <div className="space-y-3 text-gray-600">
          <p>• <strong>Tarification :</strong> De 2€ à 6€ selon le nombre d'enfants</p>
          <p>• <strong>Essai gratuit :</strong> 30 jours offerts pour les 2 premiers enfants</p>
          <p>• <strong>Sans engagement :</strong> Annulation possible à tout moment</p>
          <p>• <strong>Renouvellement :</strong> Automatique chaque mois</p>
          <p>• <strong>Support :</strong> Disponible 7j/7 par email</p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Annuler l'abonnement"
        message={subscription.status === 'trial'
          ? "Êtes-vous sûr de vouloir annuler votre essai gratuit ? Vous pourrez toujours le réactiver plus tard."
          : "Êtes-vous sûr de vouloir annuler votre abonnement ? Vous pourrez toujours le réactiver plus tard."}
        confirmText="Oui, annuler"
        cancelText="Non, conserver"
        variant="danger"
        onConfirm={handleCancelSubscription}
        onCancel={() => setShowCancelDialog(false)}
      />

    </div>
  );
}
