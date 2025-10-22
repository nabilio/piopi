import { useState, useEffect } from 'react';
import { Bell, Check, X, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AvatarDisplay } from './AvatarDisplay';

type ParentNotification = {
  id: string;
  child_id: string;
  sender_id: string;
  notification_type: string;
  content: {
    sender_name: string;
    target_name: string;
  };
  is_read: boolean;
  friendship_id: string;
  created_at: string;
};

type ParentNotificationsProps = {
  onProfileClick?: (userId: string) => void;
};

export function ParentNotifications({ onProfileClick }: ParentNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  async function loadNotifications() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('parent_notifications')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(notificationId: string, action: 'accept' | 'reject') {
    setProcessingId(notificationId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/respond-friend-request`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId, action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to respond to request');
      }

      setNotifications(notifications.filter(n => n.id !== notificationId));

      const actionText = action === 'accept' ? 'acceptée' : 'refusée';
      showToast(`Demande d'ami ${actionText} avec succès !`, 'success');
    } catch (error) {
      console.error('Error responding to friend request:', error);
      showToast('Erreur lors de la réponse à la demande', 'error');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Bell size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Aucune notification</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bell size={28} className="text-blue-500" />
          Notifications ({notifications.length})
        </h2>

        <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500"
          >
            <div className="flex items-start gap-4">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onProfileClick) {
                    console.log('Avatar clicked, sender_id:', notification.sender_id);
                    onProfileClick(notification.sender_id);
                  }
                }}
                className={onProfileClick ? "cursor-pointer hover:opacity-80 transition" : ""}
              >
                <AvatarDisplay
                  userId={notification.sender_id}
                  fallbackName={notification.content.sender_name}
                  size="md"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus size={20} className="text-blue-500" />
                  <h3 className="font-semibold text-gray-800">
                    Nouvelle demande d'ami
                  </h3>
                </div>
                <p className="text-gray-700 mb-1">
                  {onProfileClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Name clicked, sender_id:', notification.sender_id);
                        onProfileClick(notification.sender_id);
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer bg-transparent border-none p-0"
                    >
                      {notification.content.sender_name}
                    </button>
                  ) : (
                    <span className="font-semibold">{notification.content.sender_name}</span>
                  )}
                  {' '}souhaite devenir ami avec{' '}
                  <span className="font-semibold">{notification.content.target_name}</span>
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse(notification.id, 'accept')}
                  disabled={processingId === notification.id}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition font-semibold"
                >
                  <Check size={18} />
                  Accepter
                </button>
                <button
                  onClick={() => handleResponse(notification.id, 'reject')}
                  disabled={processingId === notification.id}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition font-semibold"
                >
                  <X size={18} />
                  Refuser
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
