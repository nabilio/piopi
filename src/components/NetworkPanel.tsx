import { useEffect, useState } from 'react';
import { Users, UserPlus, Clock, Check, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';

type Friend = {
  id: string;
  full_name: string;
  grade_level: string;
  total_points: number;
};

type OtherChild = {
  id: string;
  full_name: string;
  grade_level: string;
  parent_id: string;
};

type FriendRequest = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
};

type NetworkPanelProps = {
  onProfileClick?: (profileId: string) => void;
};

export function NetworkPanel({ onProfileClick }: NetworkPanelProps = {}) {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [otherChildren, setOtherChildren] = useState<OtherChild[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [childrenRequests, setChildrenRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'discover' | 'requests'>('friends');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (user && profile) {
      loadFriends();
      loadFriendRequests();
      loadOtherChildren();
      if (profile.role === 'parent') {
        loadChildrenFriendRequests();
      }
    }
  }, [user, profile]);

  async function loadFriends() {
    if (!profile) return;

    try {
      const { data: sentFriendships, error: sentError } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          friend:profiles!friendships_friend_id_fkey(id, full_name, grade_level)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      if (sentError) throw sentError;

      const { data: receivedFriendships, error: receivedError } = await supabase
        .from('friendships')
        .select(`
          user_id,
          sender:profiles!friendships_user_id_fkey(id, full_name, grade_level)
        `)
        .eq('friend_id', profile.id)
        .eq('status', 'accepted');

      if (receivedError) throw receivedError;

      const sentFriends = sentFriendships?.map((f: any) => f.friend).filter((f: any) => f !== null) || [];
      const receivedFriends = receivedFriendships?.map((f: any) => f.sender).filter((f: any) => f !== null) || [];

      const allFriends = [...sentFriends, ...receivedFriends];

      const friendsWithPoints = await Promise.all(
        allFriends.map(async (friend: any) => {
          const { data: progressData } = await supabase
            .from('progress')
            .select('points_earned')
            .eq('child_id', friend.id);

          const totalPoints = progressData?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;

          return { ...friend, total_points: totalPoints };
        })
      );

      setFriends(friendsWithPoints);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFriendRequests() {
    if (!profile) return;

    try {
      // Demandes envoyées
      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:profiles!friendships_friend_id_fkey(full_name, grade_level)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      // Demandes reçues
      const { data: received, error: receivedError } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          sender:profiles!friendships_user_id_fkey(full_name, grade_level)
        `)
        .eq('friend_id', profile.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      setSentRequests(sent || []);
      setReceivedRequests(received || []);
      setFriendRequests([...(sent || []), ...(received || [])]);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  }

  async function loadChildrenFriendRequests() {
    if (!user || profile?.role !== 'parent') return;

    try {
      // Obtenir tous les enfants du parent
      const { data: children, error: childrenError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('parent_id', user.id)
        .eq('role', 'child');

      if (childrenError) throw childrenError;

      if (!children || children.length === 0) {
        setChildrenRequests([]);
        return;
      }

      const childIds = children.map(c => c.id);

      // Obtenir toutes les demandes reçues par les enfants
      const { data: requests, error: requestsError } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          sender:profiles!friendships_user_id_fkey(id, full_name, grade_level),
          receiver:profiles!friendships_friend_id_fkey(id, full_name, grade_level)
        `)
        .in('friend_id', childIds)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      setChildrenRequests(requests || []);
    } catch (error) {
      console.error('Error loading children friend requests:', error);
    }
  }

  async function loadOtherChildren() {
    if (!profile) return;

    try {
      const { data: friendsData } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq('status', 'accepted');

      const friendIds = friendsData?.map((f: any) =>
        f.user_id === profile.id ? f.friend_id : f.user_id
      ) || [];

      const targetRole = profile.role === 'parent' ? 'parent' : 'child';

      let query = supabase
        .from('profiles')
        .select('id, full_name, grade_level, parent_id')
        .eq('role', targetRole)
        .neq('id', profile.id);

      if (friendIds.length > 0) {
        query = query.not('id', 'in', `(${friendIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOtherChildren(data || []);
    } catch (error) {
      console.error('Error loading other children:', error);
    }
  }

  async function sendFriendRequest(toChildId: string, toParentId: string) {
    if (!user || !profile) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-friend-request`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: toChildId,
          senderId: profile.id,
          targetParentId: toParentId
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec de l\'envoi de la demande');
      }

      await loadFriendRequests();
      await loadOtherChildren();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
    }
  }

  async function respondToChildRequest(friendshipId: string, accept: boolean) {
    if (!user || !profile) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Chercher la notification (peut ne pas exister pour les anciennes demandes)
      const { data: notification } = await supabase
        .from('parent_notifications')
        .select('id')
        .eq('friendship_id', friendshipId)
        .eq('parent_id', user.id)
        .maybeSingle();

      if (notification) {
        // Si la notification existe, utiliser l'API normale
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/respond-friend-request`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: notification.id,
            action: accept ? 'accept' : 'reject'
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Échec de la réponse');
        }
      } else {
        // Si pas de notification, mettre à jour directement la friendship
        const newStatus = accept ? 'accepted' : 'rejected';

        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: newStatus })
          .eq('id', friendshipId);

        if (updateError) throw updateError;

        // Récupérer les infos de la demande
        const { data: friendship } = await supabase
          .from('friendships')
          .select(`
            user_id,
            friend_id,
            sender:profiles!friendships_user_id_fkey(full_name),
            receiver:profiles!friendships_friend_id_fkey(full_name)
          `)
          .eq('id', friendshipId)
          .single();

        if (friendship) {
          // Marquer les anciennes notifications pending_approval comme lues
          await supabase
            .from('friend_request_notifications')
            .update({ is_read: true })
            .eq('friendship_id', friendshipId)
            .eq('notification_type', 'pending_approval')
            .eq('is_read', false);

          if (accept) {
            // Créer les entrées dans l'activity feed
            await supabase
              .from('activity_feed')
              .insert([
                {
                  user_id: friendship.friend_id,
                  activity_type: 'friend_added',
                  content: { friend_name: friendship.sender.full_name }
                },
                {
                  user_id: friendship.user_id,
                  activity_type: 'friend_added',
                  content: { friend_name: friendship.receiver.full_name }
                }
              ]);

            // Créer les notifications pour les enfants
            await supabase
              .from('friend_request_notifications')
              .insert([
                {
                  friendship_id: friendshipId,
                  recipient_child_id: friendship.friend_id,
                  sender_child_id: friendship.user_id,
                  notification_type: 'accepted_by_parent',
                  is_read: false
                },
                {
                  friendship_id: friendshipId,
                  recipient_child_id: friendship.user_id,
                  sender_child_id: friendship.friend_id,
                  notification_type: 'accepted_by_parent',
                  is_read: false
                }
              ]);
          } else {
            // Créer les notifications de refus pour les enfants
            await supabase
              .from('friend_request_notifications')
              .insert([
                {
                  friendship_id: friendshipId,
                  recipient_child_id: friendship.friend_id,
                  sender_child_id: friendship.user_id,
                  notification_type: 'rejected_by_parent',
                  is_read: false
                },
                {
                  friendship_id: friendshipId,
                  recipient_child_id: friendship.user_id,
                  sender_child_id: friendship.friend_id,
                  notification_type: 'rejected_by_parent',
                  is_read: false
                }
              ]);
          }
        }
      }

      await loadChildrenFriendRequests();
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
    }
  }

  async function removeFriend(friendId: string, friendName: string) {
    if (!profile) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Retirer cet ami',
      message: `Es-tu sûr de vouloir retirer ${friendName} de ta liste d'amis ?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          // Supprimer la friendship dans les deux sens
          const { error: error1 } = await supabase
            .from('friendships')
            .delete()
            .eq('user_id', profile.id)
            .eq('friend_id', friendId)
            .eq('status', 'accepted');

          const { error: error2 } = await supabase
            .from('friendships')
            .delete()
            .eq('user_id', friendId)
            .eq('friend_id', profile.id)
            .eq('status', 'accepted');

          if (error1 && error2) {
            throw error1 || error2;
          }

          setToast({ message: 'Ami retiré avec succès', type: 'success' });
          // Recharger la liste
          await loadFriends();
          await loadOtherChildren();
        } catch (error) {
          console.error('Error removing friend:', error);
          setToast({ message: 'Erreur lors de la suppression de l\'ami', type: 'error' });
        }
      }
    });
  }

  async function cancelFriendRequest(requestId: string, friendName: string) {
    if (!profile) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Annuler la demande',
      message: `Es-tu sûr de vouloir annuler ta demande d'ami envoyée à ${friendName} ?`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          // Supprimer la demande
          const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

          if (error) throw error;

          // Supprimer les notifications associées
          await supabase
            .from('friend_request_notifications')
            .delete()
            .eq('friendship_id', requestId);

          await supabase
            .from('parent_notifications')
            .delete()
            .eq('friendship_id', requestId);

          setToast({ message: 'Demande annulée avec succès', type: 'success' });
          // Recharger les listes
          await loadFriendRequests();
          await loadOtherChildren();
        } catch (error) {
          console.error('Error cancelling friend request:', error);
          setToast({ message: 'Erreur lors de l\'annulation de la demande', type: 'error' });
        }
      }
    });
  }

  function isRequestPending(userId: string) {
    return friendRequests.some(req =>
      (req.user_id === profile?.id && req.friend_id === userId) ||
      (req.friend_id === profile?.id && req.user_id === userId)
    );
  }

  const filteredFriends = friends.filter(friend =>
    friend.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.grade_level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOtherChildren = otherChildren.filter(child =>
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.grade_level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Mon Réseau</h2>
        </div>

        {profile?.role !== 'parent' && (
          <div className="flex gap-2 mb-6 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 min-w-[100px] py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-semibold text-sm sm:text-base transition ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="hidden sm:inline">Mes Amis</span>
              <span className="sm:hidden">Amis</span> ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 min-w-[100px] py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-semibold text-sm sm:text-base transition ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Demandes ({friendRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 min-w-[100px] py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-semibold text-sm sm:text-base transition ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Découvrir ({otherChildren.length})
            </button>
          </div>
        )}

        {profile?.role === 'parent' && childrenRequests.length > 0 && (
          <div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
              <Clock size={20} />
              Demandes d'amitié pour vos enfants ({childrenRequests.length})
            </h3>
            <p className="text-sm text-orange-600 mb-4">Vos enfants ont reçu des demandes d'amitié qui nécessitent votre approbation</p>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-6">
            {receivedRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  Demandes reçues ({receivedRequests.length})
                </h3>
                <div className="space-y-3">
                  {receivedRequests.map((request: any) => (
                    <div key={request.id} className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <AvatarDisplay userId={request.user_id} fallbackName={request.sender?.full_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{request.sender?.full_name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{request.sender?.grade_level}</p>
                          <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                            Envoyée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-xs sm:text-sm text-orange-600 font-semibold bg-orange-100 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                          <span className="hidden sm:inline">À valider par le parent</span>
                          <span className="sm:hidden">À valider</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserPlus size={20} />
                  Demandes envoyées ({sentRequests.length})
                </h3>
                <div className="space-y-3">
                  {sentRequests.map((request: any) => (
                    <div key={request.id} className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <AvatarDisplay userId={request.friend_id} fallbackName={request.friend?.full_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{request.friend?.full_name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{request.friend?.grade_level}</p>
                          <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                            Envoyée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs sm:text-sm text-yellow-600 font-semibold bg-yellow-100 px-2 sm:px-3 py-1 rounded-full flex items-center gap-1">
                            <Clock size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">En attente</span>
                          </div>
                          <button
                            onClick={() => cancelFriendRequest(request.id, request.friend?.full_name || 'cet ami')}
                            className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            title="Annuler la demande"
                          >
                            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friendRequests.length === 0 && (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucune demande d'amitié en cours</p>
              </div>
            )}
          </div>
        ) : (activeTab === 'friends' || profile?.role === 'parent') ? (
          profile?.role === 'parent' ? (
            <div className="space-y-6">
              {childrenRequests.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Demandes d'amitié reçues par vos enfants
                  </h3>
                  <div className="space-y-3">
                    {childrenRequests.map((request: any) => (
                      <div key={request.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                          <AvatarDisplay userId={request.user_id} fallbackName={request.sender?.full_name} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                <span className="font-bold text-blue-600">{request.sender?.full_name}</span>
                                <span className="text-gray-500"> ({request.sender?.grade_level})</span>
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                souhaite devenir ami(e) avec{' '}
                                <span className="font-bold text-purple-600">{request.receiver?.full_name}</span>
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 hidden sm:block">
                              Demande envoyée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => respondToChildRequest(request.id, true)}
                              className="flex-1 sm:flex-none p-2 sm:p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition flex items-center justify-center gap-1 sm:gap-2"
                            >
                              <Check size={18} className="sm:w-5 sm:h-5" />
                              <span className="font-semibold text-sm sm:text-base">Accepter</span>
                            </button>
                            <button
                              onClick={() => respondToChildRequest(request.id, false)}
                              className="flex-1 sm:flex-none p-2 sm:p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition flex items-center justify-center gap-1 sm:gap-2"
                            >
                              <X size={18} className="sm:w-5 sm:h-5" />
                              <span className="font-semibold text-sm sm:text-base">Refuser</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucune demande d'amitié en attente pour vos enfants</p>
                </div>
              )}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun ami trouvé' : 'Tu n\'as pas encore d\'amis'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 border-2 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onProfileClick?.(friend.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFriend(friend.id, friend.full_name);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-md z-10"
                    title="Retirer cet ami"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-3 mb-3">
                    <AvatarDisplay userId={friend.id} fallbackName={friend.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{friend.full_name}</h3>
                      <p className="text-sm text-gray-600">{friend.grade_level}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Total points</p>
                    <p className="font-bold text-yellow-600">{friend.total_points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredOtherChildren.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun enfant trouvé' : 'Aucun autre enfant disponible'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOtherChildren.map((child) => {
                const isPending = isRequestPending(child.id);
                return (
                  <div
                    key={child.id}
                    className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-4 border-2 border-gray-200"
                  >
                    <div
                      onClick={() => onProfileClick?.(child.id)}
                      className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-white/50 rounded-lg p-2 -m-2 transition"
                    >
                      <AvatarDisplay userId={child.id} fallbackName={child.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{child.full_name}</h3>
                        <p className="text-sm text-gray-600">{child.grade_level}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendFriendRequest(child.id, child.parent_id);
                      }}
                      disabled={isPending}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                        isPending
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                      }`}
                    >
                      {isPending ? (
                        <>
                          <Clock size={16} />
                          En attente
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Ajouter
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirmer"
        cancelText="Annuler"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
