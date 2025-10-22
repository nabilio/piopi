import { Bell, UserPlus, Sword, Check, X, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type FriendRequestNotification = {
  id: string;
  friendship_id: string;
  sender_child_id: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  sender: {
    full_name: string;
    grade_level: string;
  };
};

type BattleNotification = {
  id: string;
  battle_id: string;
  from_user_id: string;
  status: string;
  created_at: string;
  read_at: string | null;
  sender: {
    full_name: string;
  };
};

type AllNotifications = {
  friendRequests: FriendRequestNotification[];
  battles: BattleNotification[];
};

type ChildNotificationsProps = {
  onBattleAccepted?: (battleId: string) => void;
};

export function ChildNotifications({ onBattleAccepted }: ChildNotificationsProps) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AllNotifications>({
    friendRequests: [],
    battles: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadNotifications();
    }
  }, [user, profile]);

  async function loadNotifications() {
    if (!profile) return;

    try {
      const [friendRequestsResponse, battleResponse] = await Promise.all([
        supabase
          .from('friend_request_notifications')
          .select(`
            id,
            friendship_id,
            sender_child_id,
            notification_type,
            is_read,
            created_at,
            sender:profiles!friend_request_notifications_sender_child_id_fkey(full_name, grade_level)
          `)
          .eq('recipient_child_id', profile.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('battle_notifications')
          .select(`
            id,
            battle_id,
            from_user_id,
            status,
            created_at,
            read_at,
            sender:profiles!battle_notifications_from_user_id_fkey(full_name)
          `)
          .eq('user_id', profile.id)
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setNotifications({
        friendRequests: friendRequestsResponse.data || [],
        battles: battleResponse.data || []
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications({ friendRequests: [], battles: [] });
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string, isBattleNotification = false) {
    try {
      if (isBattleNotification) {
        await supabase
          .from('battle_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);
      } else {
        await supabase
          .from('friend_request_notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      }

      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function viewBattleInvitation(battleId: string, notificationId: string) {
    try {
      await supabase
        .from('battle_notifications')
        .update({
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (onBattleAccepted) {
        onBattleAccepted(battleId);
      }
    } catch (error) {
      console.error('Error viewing battle invitation:', error);
    }
  }

  function getNotificationMessage(notification: FriendRequestNotification) {
    if (notification.notification_type === 'pending_approval') {
      return `${notification.sender.full_name} souhaite devenir ami avec toi. Ton parent doit valider cette demande.`;
    } else if (notification.notification_type === 'accepted_by_parent') {
      return `Ton parent a accepté la demande d'ami de ${notification.sender.full_name}. Vous êtes maintenant amis!`;
    } else if (notification.notification_type === 'rejected_by_parent') {
      return `Ton parent a refusé la demande d'ami de ${notification.sender.full_name}.`;
    }
    return 'Nouvelle notification';
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Bell size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : notifications.friendRequests.length === 0 && notifications.battles.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
              <Bell size={48} className="text-blue-600" />
            </div>
            <p className="text-xl text-gray-600 font-semibold mb-2">Aucune notification</p>
            <p className="text-gray-500">Tu n'as pas de notifications pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.battles.filter(n => n.status === 'pending' && !n.read_at).map((notification) => (
              <div
                key={notification.id}
                onClick={() => viewBattleInvitation(notification.battle_id, notification.id)}
                className="rounded-xl p-4 border-2 bg-gradient-to-r from-red-50 to-orange-50 border-red-200 cursor-pointer hover:border-red-400 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-red-400 to-orange-400">
                    <Sword size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-1">Invitation Battle</h3>
                    <p className="text-gray-600">
                      {notification.sender.full_name} t'invite à un battle!
                    </p>
                  </div>
                  <div className="text-red-500">
                    <Eye size={20} />
                  </div>
                </div>
              </div>
            ))}
            {notifications.battles.filter(n => n.status === 'accepted').map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border-2 transition ${
                  notification.read_at
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.read_at
                      ? 'bg-gray-300'
                      : 'bg-gradient-to-br from-green-400 to-emerald-400'
                  }`}>
                    <Check size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-1">Battle accepté</h3>
                    <p className="text-gray-600 mb-2">
                      {notification.sender.full_name} a accepté ton invitation!
                    </p>
                    {!notification.read_at && (
                      <button
                        onClick={() => markAsRead(notification.id, true)}
                        className="text-sm text-green-600 hover:text-green-700 font-semibold"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notifications.battles.filter(n => n.status === 'declined').map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border-2 transition ${
                  notification.read_at
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.read_at
                      ? 'bg-gray-300'
                      : 'bg-gradient-to-br from-red-400 to-pink-400'
                  }`}>
                    <X size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-1">Battle refusé</h3>
                    <p className="text-gray-600 mb-2">
                      {notification.sender.full_name} a refusé ton invitation.
                    </p>
                    {!notification.read_at && (
                      <button
                        onClick={() => markAsRead(notification.id, true)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notifications.friendRequests.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border-2 transition ${
                  notification.is_read
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.is_read
                      ? 'bg-gray-300'
                      : 'bg-gradient-to-br from-blue-400 to-purple-400'
                  }`}>
                    <UserPlus size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-1">
                      {notification.notification_type === 'pending_approval' && 'Demande d\'ami en attente'}
                      {notification.notification_type === 'accepted_by_parent' && 'Demande acceptée'}
                      {notification.notification_type === 'rejected_by_parent' && 'Demande refusée'}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex-shrink-0"
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
