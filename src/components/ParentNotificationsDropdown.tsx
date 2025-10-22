import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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

type ParentNotificationsDropdownProps = {
  onClose: () => void;
  onNotificationCountChange?: () => void;
};

export function ParentNotificationsDropdown({ onClose, onNotificationCountChange }: ParentNotificationsDropdownProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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

      await loadNotifications();
      onNotificationCountChange?.();
    } catch (error) {
      console.error('Error responding to friend request:', error);
    } finally {
      setProcessingId(null);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={20} className="text-blue-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  }

  function getNotificationMessage(notification: ParentNotification) {
    const content = notification.content;
    switch (notification.notification_type) {
      case 'friend_request':
        return `${content.sender_name} veut devenir ami avec ${content.target_name}`;
      case 'friend_request_accepted':
        return `${content.sender_name} a accepté l'invitation de ${content.target_name}`;
      case 'friend_request_rejected':
        return `${content.sender_name} a refusé l'invitation de ${content.target_name}`;
      default:
        return 'Nouvelle notification';
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden z-50"
    >
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <AvatarDisplay
                    userId={notification.sender_id}
                    fallbackName={notification.content.sender_name}
                    size="sm"
                  />
                </div>

                {notification.notification_type === 'friend_request' && (
                  <div className="flex gap-2 ml-8">
                    <button
                      onClick={() => handleResponse(notification.id, 'accept')}
                      disabled={processingId === notification.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition text-sm font-semibold disabled:opacity-50"
                    >
                      <Check size={16} />
                      Accepter
                    </button>
                    <button
                      onClick={() => handleResponse(notification.id, 'reject')}
                      disabled={processingId === notification.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm font-semibold disabled:opacity-50"
                    >
                      <X size={16} />
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
