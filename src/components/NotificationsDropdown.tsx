import { useEffect, useState, useRef } from 'react';
import { Bell, UserPlus, Check, X, Clock, Sword, Eye } from 'lucide-react';
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
  read_at: string | null;
  created_at: string;
  sender: {
    full_name: string;
  };
};

type NotificationsDropdownProps = {
  isOpen?: boolean;
  onClose: () => void;
  onBattleAccepted?: (battleId: string) => void;
  onNotificationCountChange?: () => void;
};

export function NotificationsDropdown({ isOpen = true, onClose, onBattleAccepted, onNotificationCountChange }: NotificationsDropdownProps) {
  const { user, profile } = useAuth();
  const [friendRequestNotifications, setFriendRequestNotifications] = useState<FriendRequestNotification[]>([]);
  const [battleNotifications, setBattleNotifications] = useState<BattleNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user && profile) {
      loadFriendRequests();
      loadBattleNotifications();
    }
  }, [isOpen, user, profile]);

  // Auto-mark all as read after 5 seconds when notifications are loaded
  useEffect(() => {
    if (!loading && isOpen && (friendRequestNotifications.length > 0 || battleNotifications.length > 0)) {
      const autoMarkTimer = setTimeout(() => {
        markAllAsRead(false); // Don't close dropdown automatically
      }, 5000);

      return () => clearTimeout(autoMarkTimer);
    }
  }, [loading, isOpen, friendRequestNotifications.length, battleNotifications.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  async function loadFriendRequests() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFriendRequestNotifications(data || []);
    } catch (error) {
      console.error('Error loading friend request notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBattleNotifications() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('battle_notifications')
        .select(`
          id,
          battle_id,
          from_user_id,
          status,
          read_at,
          created_at,
          sender:profiles!battle_notifications_from_user_id_fkey(full_name)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBattleNotifications(data || []);
    } catch (error) {
      console.error('Error loading battle notifications:', error);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    try {
      await supabase
        .from('friend_request_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      await loadFriendRequests();
      onNotificationCountChange?.();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead(autoClose = true) {
    if (!profile) return;

    try {
      await Promise.all([
        supabase
          .from('friend_request_notifications')
          .update({ is_read: true })
          .eq('recipient_child_id', profile.id)
          .eq('is_read', false),
        supabase
          .from('battle_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .is('read_at', null)
      ]);

      setFriendRequestNotifications([]);
      setBattleNotifications([]);
      onNotificationCountChange?.();

      if (autoClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function viewBattleInvitation(battleId: string, notificationId: string) {
    await supabase
      .from('battle_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    onNotificationCountChange?.();
    onBattleAccepted?.(battleId);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 max-h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 flex flex-col"
    >
      {/* Header with "Mark all as read" button */}
      {!loading && (friendRequestNotifications.length > 0 || battleNotifications.length > 0) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
          <button
            onClick={markAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <Check size={14} />
            Tout marquer comme lu
          </button>
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : friendRequestNotifications.length === 0 && battleNotifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {battleNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => viewBattleInvitation(notification.battle_id, notification.id)}
                className="p-3 hover:bg-red-50 transition cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-red-100">
                    <Sword size={16} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 mb-1">
                      <span className="font-semibold">{notification.sender.full_name}</span> t'invite à un battle
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-red-500">
                    <Eye size={16} />
                  </div>
                </div>
              </div>
            ))}
            {friendRequestNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notification.notification_type === 'pending_approval' ? 'bg-orange-100' :
                    notification.notification_type === 'accepted_by_parent' ? 'bg-green-100' :
                    'bg-red-100'
                  }`}>
                    {notification.notification_type === 'pending_approval' ? (
                      <Clock size={16} className="text-orange-600" />
                    ) : notification.notification_type === 'accepted_by_parent' ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <X size={16} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 mb-1">
                      {notification.notification_type === 'pending_approval' && (
                        <>
                          <span className="font-semibold">{notification.sender.full_name}</span> souhaite devenir ton ami
                        </>
                      )}
                      {notification.notification_type === 'accepted_by_parent' && (
                        <>
                          Ton parent a accepté la demande d'ami de <span className="font-semibold">{notification.sender.full_name}</span>. Vous êtes maintenant amis!
                        </>
                      )}
                      {notification.notification_type === 'rejected_by_parent' && (
                        <>
                          Ton parent a refusé la demande d'ami de <span className="font-semibold">{notification.sender.full_name}</span>.
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {notification.notification_type === 'pending_approval' ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-blue-800">
                          En attente de validation par ton parent
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
