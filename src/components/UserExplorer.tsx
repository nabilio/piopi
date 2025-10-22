import { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Filter, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { Dialog } from './Dialog';
import { useDialog } from '../hooks/useDialog';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  grade_level?: string;
  department?: string;
  parent_id?: string;
};

type FriendRequest = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
};

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

const FRENCH_DEPARTMENTS = [
  '01 - Ain', '02 - Aisne', '03 - Allier', '04 - Alpes-de-Haute-Provence', '05 - Hautes-Alpes',
  '06 - Alpes-Maritimes', '07 - Ardèche', '08 - Ardennes', '09 - Ariège', '10 - Aube',
  '11 - Aude', '12 - Aveyron', '13 - Bouches-du-Rhône', '14 - Calvados', '15 - Cantal',
  '16 - Charente', '17 - Charente-Maritime', '18 - Cher', '19 - Corrèze', '21 - Côte-d\'Or',
  '22 - Côtes-d\'Armor', '23 - Creuse', '24 - Dordogne', '25 - Doubs', '26 - Drôme',
  '27 - Eure', '28 - Eure-et-Loir', '29 - Finistère', '2A - Corse-du-Sud', '2B - Haute-Corse',
  '30 - Gard', '31 - Haute-Garonne', '32 - Gers', '33 - Gironde', '34 - Hérault',
  '35 - Ille-et-Vilaine', '36 - Indre', '37 - Indre-et-Loire', '38 - Isère', '39 - Jura',
  '40 - Landes', '41 - Loir-et-Cher', '42 - Loire', '43 - Haute-Loire', '44 - Loire-Atlantique',
  '45 - Loiret', '46 - Lot', '47 - Lot-et-Garonne', '48 - Lozère', '49 - Maine-et-Loire',
  '50 - Manche', '51 - Marne', '52 - Haute-Marne', '53 - Mayenne', '54 - Meurthe-et-Moselle',
  '55 - Meuse', '56 - Morbihan', '57 - Moselle', '58 - Nièvre', '59 - Nord',
  '60 - Oise', '61 - Orne', '62 - Pas-de-Calais', '63 - Puy-de-Dôme', '64 - Pyrénées-Atlantiques',
  '65 - Hautes-Pyrénées', '66 - Pyrénées-Orientales', '67 - Bas-Rhin', '68 - Haut-Rhin', '69 - Rhône',
  '70 - Haute-Saône', '71 - Saône-et-Loire', '72 - Sarthe', '73 - Savoie', '74 - Haute-Savoie',
  '75 - Paris', '76 - Seine-Maritime', '77 - Seine-et-Marne', '78 - Yvelines', '79 - Deux-Sèvres',
  '80 - Somme', '81 - Tarn', '82 - Tarn-et-Garonne', '83 - Var', '84 - Vaucluse',
  '85 - Vendée', '86 - Vienne', '87 - Haute-Vienne', '88 - Vosges', '89 - Yonne',
  '90 - Territoire de Belfort', '91 - Essonne', '92 - Hauts-de-Seine', '93 - Seine-Saint-Denis',
  '94 - Val-de-Marne', '95 - Val-d\'Oise', '971 - Guadeloupe', '972 - Martinique', '973 - Guyane',
  '974 - La Réunion', '976 - Mayotte'
];

type UserExplorerProps = {
  onViewProfile?: (userId: string) => void;
};

export function UserExplorer({ onViewProfile }: UserExplorerProps = {}) {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [childrenRequests, setChildrenRequests] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | 'child' | 'parent'>('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const dialog = useDialog();

  useEffect(() => {
    console.log('UserExplorer: useEffect triggered', {
      hasUser: !!user,
      hasProfile: !!profile,
      roleFilter,
      gradeLevelFilter,
      departmentFilter
    });
    if (user && profile) {
      loadFriendships();
      loadAllUsers();
      if (profile.role === 'parent') {
        loadChildrenFriendRequests();
      }
    } else {
      console.log('UserExplorer: Waiting for user and profile...');
    }
  }, [user, profile, roleFilter, gradeLevelFilter, departmentFilter]);

  async function loadFriendships() {
    if (!user || !profile) return;

    console.log('Loading friendships for profile:', profile.id);

    const { data: friendsData } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
      .eq('status', 'accepted');

    if (friendsData) {
      const friendIds = friendsData.map(f =>
        f.user_id === profile.id ? f.friend_id : f.user_id
      );
      setFriends(friendIds);
      console.log('Friends loaded:', friendIds);
    }

    const { data: requestsData } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
      .eq('status', 'pending');

    if (requestsData) {
      console.log('Pending requests loaded:', requestsData);
      setFriendRequests(requestsData);
    }
  }

  async function loadAllUsers() {
    if (!user || !profile) {
      console.log('UserExplorer: No user or profile', { user: !!user, profile: !!profile });
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, grade_level, department, parent_id')
        .neq('id', profile.id)
        .eq('banned', false)
        .order('full_name', { ascending: true });

      query = query.eq('role', 'child');

      if (gradeLevelFilter !== 'all') {
        query = query.eq('grade_level', gradeLevelFilter);
      }

      if (departmentFilter !== 'all') {
        query = query.eq('department', departmentFilter);
      }

      if (searchQuery.trim()) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('UserExplorer query error:', error);
        throw error;
      }

      console.log('UserExplorer loaded users:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    loadAllUsers();
  }

  async function loadChildrenFriendRequests() {
    if (!user || profile?.role !== 'parent') return;

    try {
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

      console.log('Children friend requests loaded:', requests);
      setChildrenRequests(requests || []);
    } catch (error) {
      console.error('Error loading children friend requests:', error);
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
      dialog.alert(
        accept ? 'Invitation acceptée avec succès' : 'Invitation refusée',
        'Succès',
        'success'
      );
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      dialog.alert(error.message || 'Erreur lors de la réponse', 'Erreur', 'error');
    }
  }

  async function sendFriendRequest(toUserId: string) {
    if (!user || !profile) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-friend-request`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: toUserId,
          senderId: profile.id
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec de l\'envoi de la demande d\'ami');
      }

      setFriendRequests([...friendRequests, {
        id: result.friendship.id,
        user_id: profile.id,
        friend_id: toUserId,
        status: 'pending',
      }]);

      await loadFriendships();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
    }
  }

  function isRequestPending(userId: string) {
    const isPending = friendRequests.some(req =>
      (req.user_id === profile?.id && req.friend_id === userId) ||
      (req.friend_id === profile?.id && req.user_id === userId)
    );
    console.log(`Checking if request pending for user ${userId}:`, {
      isPending,
      profileId: profile?.id,
      friendRequests: friendRequests.map(r => ({ user_id: r.user_id, friend_id: r.friend_id }))
    });
    return isPending;
  }

  function getPendingRequestId(userId: string): string | null {
    const request = friendRequests.find(req =>
      (req.user_id === profile?.id && req.friend_id === userId) ||
      (req.friend_id === profile?.id && req.user_id === userId)
    );
    return request?.id || null;
  }

  async function cancelFriendRequest(friendshipId: string) {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriendRequests(friendRequests.filter(req => req.id !== friendshipId));
      dialog.alert('Invitation annulée', 'Succès', 'success');
    } catch (error: any) {
      console.error('Error canceling friend request:', error);
      dialog.alert(error.message || 'Erreur lors de l\'annulation', 'Erreur', 'error');
    }
  }

  function isFriend(userId: string) {
    return friends.includes(userId);
  }

  return (
    <div className="max-w-4xl mx-auto">
      {profile?.role === 'parent' && childrenRequests.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-3xl shadow-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
            <UserPlus size={24} />
            Demandes d'amitié pour vos enfants ({childrenRequests.length})
          </h3>
          <div className="space-y-3">
            {childrenRequests.map((request: any) => (
              <div key={request.id} className="bg-white border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <AvatarDisplay userId={request.user_id} fallbackName={request.sender?.full_name} size="md" />
                  <div className="flex-1">
                    <div className="mb-2">
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-bold text-blue-600">{request.sender?.full_name}</span>
                        <span className="text-gray-500"> ({request.sender?.grade_level})</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        souhaite devenir ami(e) avec{' '}
                        <span className="font-bold text-purple-600">{request.receiver?.full_name}</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Envoyée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToChildRequest(request.id, true)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center gap-2 font-semibold"
                    >
                      <Check size={18} />
                      Accepter
                    </button>
                    <button
                      onClick={() => respondToChildRequest(request.id, false)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition flex items-center gap-2 font-semibold"
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
      )}

      <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={28} />
          Réseau
        </h2>
        <p className="text-gray-600 mb-6">
          Découvre et connecte avec d'autres élèves de la plateforme
        </p>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher par nom..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filtres:</span>
            </div>

            <select
              value={gradeLevelFilter}
              onChange={(e) => setGradeLevelFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
            >
              <option value="all">Tous les niveaux</option>
              {GRADE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
            >
              <option value="all">Tous les départements</option>
              {FRENCH_DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {(gradeLevelFilter !== 'all' || departmentFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setGradeLevelFilter('all');
                  setDepartmentFilter('all');
                  setSearchQuery('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      ) : users.length > 0 ? (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {users.length} utilisateur{users.length > 1 ? 's' : ''} trouvé{users.length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">
            {users.map((userProfile) => (
              <div
                key={userProfile.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
              >
                <button
                  onClick={() => onViewProfile?.(userProfile.id)}
                  className="hover:opacity-80 transition"
                >
                  <AvatarDisplay
                    userId={userProfile.id}
                    fallbackName={userProfile.full_name}
                    size="sm"
                  />
                </button>
                <button
                  onClick={() => onViewProfile?.(userProfile.id)}
                  className="flex-1 text-left hover:bg-gray-200 p-2 rounded-lg transition"
                >
                  <p className="font-semibold text-gray-800">{userProfile.full_name}</p>
                  <p className="text-sm text-gray-600">
                    {userProfile.grade_level && `${userProfile.grade_level}`}
                    {userProfile.grade_level && userProfile.department && ' • '}
                    {userProfile.department}
                  </p>
                </button>
                <div>
                  {profile?.role === 'parent' ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                      Consultation uniquement
                    </div>
                  ) : isFriend(userProfile.id) ? (
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <Users size={18} />
                      Ami
                    </div>
                  ) : isRequestPending(userProfile.id) ? (
                    <button
                      onClick={() => {
                        const requestId = getPendingRequestId(userProfile.id);
                        if (requestId) cancelFriendRequest(requestId);
                      }}
                      className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-full transition"
                    >
                      <X size={18} />
                      Annuler
                    </button>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(userProfile.id)}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition"
                    >
                      <UserPlus size={18} />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
          <p className="text-gray-600">Aucun utilisateur trouvé</p>
        </div>
      )}

      <Dialog
        isOpen={dialog.isOpen}
        onClose={dialog.handleClose}
        onConfirm={dialog.handleConfirm}
        title={dialog.config.title}
        message={dialog.config.message}
        type={dialog.config.type}
        confirmText={dialog.config.confirmText}
        cancelText={dialog.config.cancelText}
        showCancel={dialog.config.showCancel}
      />
    </div>
  );
}
