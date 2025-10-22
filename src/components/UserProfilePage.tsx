import { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, UserCheck, Star, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AvatarDisplay } from './AvatarDisplay';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  grade_level?: string;
  department?: string;
  birth_date?: string;
  custom_status_id?: string;
  total_points?: number;
  created_at: string;
};

type CustomStatus = {
  id: string;
  emoji: string;
  label: string;
};

type UserProfilePageProps = {
  userId: string;
  onBack: () => void;
};

export function UserProfilePage({ userId, onBack }: UserProfilePageProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [customStatus, setCustomStatus] = useState<CustomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [achievementsCount, setAchievementsCount] = useState(0);

  useEffect(() => {
    if (userId && profile) {
      loadProfile();
      checkFriendship();
    }
  }, [userId, profile]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);

      if (data.custom_status_id) {
        const { data: statusData } = await supabase
          .from('custom_statuses')
          .select('*')
          .eq('id', data.custom_status_id)
          .single();

        if (statusData) {
          setCustomStatus(statusData);
        }
      }

      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId);

      if (achievementsData) {
        setAchievementsCount(achievementsData.length);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkFriendship() {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${profile.id})`)
        .maybeSingle();

      if (data) {
        if (data.status === 'accepted') {
          setIsFriend(true);
        } else if (data.status === 'pending') {
          setFriendRequestSent(true);
        }
      }
    } catch (error) {
      console.error('Error checking friendship:', error);
    }
  }

  async function sendFriendRequest() {
    if (!profile) return;

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
          targetUserId: userId,
          senderId: profile.id
        }),
      });

      if (response.ok) {
        setFriendRequestSent(true);
        showToast('Invitation envoyée !', 'success');
      } else {
        showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Profil introuvable</p>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 bg-white px-4 py-2 rounded-full shadow-sm transition"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative">
              <AvatarDisplay userId={userId} fallbackName={userProfile.full_name} size="lg" />
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-1">{userProfile.full_name}</h1>
                  <p className="text-lg text-gray-600">
                    Classe de {userProfile.grade_level}
                    {userProfile.department && (
                      <span className="text-gray-500"> • {userProfile.department}</span>
                    )}
                  </p>
                </div>

                {profile?.id !== userId && profile?.role !== 'parent' && (
                  <div>
                    {isFriend ? (
                      <div className="bg-green-100 text-green-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 self-start md:self-auto">
                        <Trophy size={20} />
                        Ami
                      </div>
                    ) : friendRequestSent ? (
                      <div className="bg-gray-200 text-gray-600 px-6 py-3 rounded-full font-semibold self-start md:self-auto">
                        Demande envoyée
                      </div>
                    ) : (
                      <button
                        onClick={sendFriendRequest}
                        className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition font-semibold flex items-center gap-2 self-start md:self-auto"
                      >
                        <UserPlus size={20} />
                        Ajouter en ami
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-200">
                  <Star className="text-yellow-500" size={20} />
                  <span className="font-bold text-yellow-700">{userProfile.total_points || 0} points</span>
                </div>

                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
                  <Trophy className="text-purple-500" size={20} />
                  <span className="font-bold text-purple-700">{achievementsCount} succès</span>
                </div>
              </div>

              {customStatus && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-medium">
                  <span className="text-2xl">{customStatus.emoji}</span>
                  <span>{customStatus.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
