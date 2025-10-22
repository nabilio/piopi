import { useState, useEffect } from 'react';
import { UserPlus, Users, Check, X, Search, Clock, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { useDialog } from '../hooks/useDialog';
import { ConfirmDialog } from './ConfirmDialog';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  grade_level?: string;
};

type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend?: Profile;
  user?: Profile;
};

type FriendsPanelProps = {
  isChildView?: boolean;
  onProfileClick?: (profileId: string) => void;
};

export function FriendsPanel({ isChildView = false, onProfileClick }: FriendsPanelProps) {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [allChildren, setAllChildren] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string } | null>(null);
  const { isOpen: isRemoveDialogOpen, open: openRemoveDialog, close: closeRemoveDialog } = useDialog();

  useEffect(() => {
    if (user) {
      loadFriends();
      loadAllChildren();
    }
  }, [user]);

  async function loadAllChildren() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, grade_level, age')
        .eq('role', 'child')
        .neq('id', profile.id)
        .order('full_name');

      if (error) throw error;

      const allFriendIds = [
        ...friends.map(f => f.user_id === profile.id ? f.friend_id : f.user_id),
        ...sentRequests.map(f => f.friend_id),
        ...pendingRequests.map(f => f.user_id)
      ];

      const filtered = (data || []).filter(p => !allFriendIds.includes(p.id));
      setAllChildren(filtered);
    } catch (error) {
      console.error('Error loading all children:', error);
    }
  }

  async function loadFriends() {
    if (!profile) return;

    try {
      const { data: acceptedFriends, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(id, email, full_name, grade_level),
          user:profiles!friendships_user_id_fkey(id, email, full_name, grade_level)
        `)
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;
      setFriends(acceptedFriends || []);

      const { data: pending, error: pendingError } = await supabase
        .from('friendships')
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(id, email, full_name, grade_level)
        `)
        .eq('friend_id', profile.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;
      setPendingRequests(pending || []);

      const { data: sent, error: sentError } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(id, email, full_name, grade_level)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;
      setSentRequests(sent || []);

      await loadAllChildren();
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim() || !profile) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, grade_level')
        .neq('id', profile.id)
        .eq('role', 'child')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      const allFriendIds = [
        ...friends.map(f => f.user_id === profile.id ? f.friend_id : f.user_id),
        ...sentRequests.map(f => f.friend_id),
        ...pendingRequests.map(f => f.user_id)
      ];

      const filtered = (data || []).filter(p => !allFriendIds.includes(p.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest(friendId: string) {
    setLoading(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !profile) {
        throw new Error('Non authentifié');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-friend-request`;

      console.log('Sending friend request:', {
        targetUserId: friendId,
        senderId: profile.id,
        profileRole: profile.role
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: friendId,
          senderId: profile.id
        })
      });

      const result = await response.json();
      console.log('Friend request response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de la demande');
      }

      setMessage(result.message || 'Demande envoyée avec succès!');
      await loadFriends();
      setSearchResults([]);
      setSearchQuery('');
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
      console.error('Error sending friend request:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acceptFriendRequest(friendshipId: string, senderId: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      await supabase.from('activity_feed').insert({
        user_id: user?.id,
        activity_type: 'friend_added',
        content: { friend_id: senderId },
        points_earned: 5
      });

      setMessage('Ami ajouté !');
      await loadFriends();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelSentRequest(friendshipId: string) {
    setLoading(true);
    setMessage('');
    try {
      // Supprimer les notifications liées
      await supabase
        .from('friend_request_notifications')
        .delete()
        .eq('friendship_id', friendshipId);

      await supabase
        .from('parent_notifications')
        .delete()
        .eq('friendship_id', friendshipId);

      // Supprimer la demande d'amitié
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setMessage('Invitation annulée');
      await loadFriends();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
      console.error('Error canceling friend request:', error);
    } finally {
      setLoading(false);
    }
  }

  async function rejectFriendRequest(friendshipId: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setMessage('Demande rejetée');
      await loadFriends();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveFriendClick(friendshipId: string, friendName: string) {
    setFriendToRemove({ id: friendshipId, name: friendName });
    openRemoveDialog();
  }

  async function confirmRemoveFriend() {
    if (!friendToRemove) return;

    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendToRemove.id);

      if (error) throw error;

      setMessage('Ami supprimé de ta liste');
      await loadFriends();
      closeRemoveDialog();
      setFriendToRemove(null);
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
      console.error('Error removing friend:', error);
    } finally {
      setLoading(false);
    }
  }

  if (isChildView) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Mes Amis</h2>

          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Clock size={18} className="text-orange-500 sm:w-5 sm:h-5" />
                Demandes en attente ({pendingRequests.length})
              </h3>
              <div className="bg-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-orange-200">
                <p className="text-orange-800 text-xs sm:text-sm font-semibold">
                  Tes parents doivent approuver les demandes d'amis pour ta sécurité.
                </p>
              </div>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-200">
                    <div className="flex-shrink-0">
                      <AvatarDisplay
                        userId={request.user_id}
                        fallbackName={request.user?.full_name}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">{request.user?.full_name}</p>
                      <p className="text-xs sm:text-sm text-orange-600 flex items-center gap-1">
                        <Clock size={12} className="sm:w-[14px] sm:h-[14px]" />
                        En attente d'approbation parentale
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentRequests.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-500 sm:w-5 sm:h-5" />
                Demandes envoyées ({sentRequests.length})
              </h3>
              <div className="space-y-2">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-200">
                    <div className="flex-shrink-0">
                      <AvatarDisplay
                        userId={request.friend_id}
                        fallbackName={request.friend?.full_name}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">{request.friend?.full_name}</p>
                      <p className="text-xs sm:text-sm text-blue-600 flex items-center gap-1">
                        <Clock size={12} className="sm:w-[14px] sm:h-[14px]" />
                        En attente de réponse...
                      </p>
                    </div>
                    <button
                      onClick={() => cancelSentRequest(request.id)}
                      disabled={loading}
                      className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <X size={14} className="sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Annuler</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <Users size={18} className="text-green-500 sm:w-5 sm:h-5" />
              Mes amis ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-semibold mb-2">Tu n'as pas encore d'amis</p>
                <p className="text-gray-400 text-sm mb-4">
                  Découvre d'autres enfants et envoie-leur des demandes d'amitié !
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friendship) => {
                  const friend = friendship.user_id === profile?.id ? friendship.friend : friendship.user;
                  return (
                    <div
                      key={friendship.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg sm:rounded-xl border border-green-200"
                    >
                      <button
                        onClick={() => onProfileClick?.(friend?.id || '')}
                        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-green-100 rounded-lg p-1 transition"
                      >
                        <AvatarDisplay
                          userId={friend?.id || ''}
                          fallbackName={friend?.full_name}
                          size="sm"
                        />
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">{friend?.full_name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{friend?.grade_level}</p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriendClick(friendship.id, friend?.full_name || '');
                        }}
                        disabled={loading}
                        className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1"
                        title="Supprimer cet ami"
                      >
                        <UserMinus size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Retirer</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section pour découvrir tous les enfants */}
          {allChildren.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-purple-500 sm:w-5 sm:h-5" />
                Découvre d'autres enfants ({allChildren.length})
              </h3>
              <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                {allChildren.map((child) => (
                  <div key={child.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-purple-50 rounded-lg sm:rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm sm:text-base font-bold flex-shrink-0">
                        {child.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">{child.full_name}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{child.grade_level || `${child.age} ans`}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(child.id)}
                      disabled={loading}
                      className="flex items-center gap-1 sm:gap-2 bg-purple-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-purple-600 transition disabled:opacity-50 font-semibold flex-shrink-0"
                    >
                      <UserPlus size={14} className="sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Inviter</span>
                      <span className="sm:hidden">+</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Amis</h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={20} />
            Rechercher des amis
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              placeholder="Rechercher par nom ou email..."
              className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={searchUsers}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition disabled:opacity-50 font-semibold"
            >
              Rechercher
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{profile.full_name}</p>
                      <p className="text-sm text-gray-500">{profile.grade_level || profile.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(profile.id)}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 text-sm font-semibold"
                  >
                    <UserPlus size={16} />
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">Demandes reçues ({pendingRequests.length})</h3>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                      {request.user?.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{request.user?.full_name}</p>
                      <p className="text-sm text-gray-500">{request.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id, request.user_id)}
                      disabled={loading}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 text-sm font-semibold"
                    >
                      <Check size={16} />
                      Accepter
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      disabled={loading}
                      className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm font-semibold"
                    >
                      <X size={16} />
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sentRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">Demandes envoyées ({sentRequests.length})</h3>
            <div className="space-y-2">
              {sentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay
                      userId={request.friend_id}
                      fallbackName={request.friend?.full_name}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{request.friend?.full_name}</p>
                      <p className="text-sm text-gray-500">En attente...</p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelSentRequest(request.id)}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <X size={16} />
                    Annuler
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} />
            Mes amis ({friends.length})
          </h3>
          {friends.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Vous n'avez pas encore d'amis</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friendship) => {
                const friend = friendship.user_id === user?.id ? friendship.friend : friendship.user;
                return (
                  <div key={friendship.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                      {friend?.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{friend?.full_name}</p>
                      <p className="text-sm text-gray-500">{friend?.grade_level || friend?.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFriendClick(friendship.id, friend?.full_name || '')}
                      disabled={loading}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1"
                      title="Supprimer cet ami"
                    >
                      <UserMinus size={16} />
                      Retirer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isRemoveDialogOpen}
        onClose={closeRemoveDialog}
        onConfirm={confirmRemoveFriend}
        title="Retirer cet ami ?"
        message={`Es-tu sûr(e) de vouloir retirer ${friendToRemove?.name || 'cet ami'} de ta liste d'amis ? Vous ne pourrez plus voir vos activités mutuellement.`}
        confirmText="Retirer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  );
}
