import { useState, useEffect } from 'react';
import { Trophy, Star, Award, UserPlus, Clock, Target, Zap, Pencil, Palette, Trash2, Share2, Sparkles, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { DrawingCanvas } from './DrawingCanvas';

type ChildProfileProps = {
  childId: string;
  onBack: () => void;
  onStatusClick?: () => void;
  onAvatarClick?: () => void;
};

type ProfileData = {
  id: string;
  full_name: string;
  age: number;
  grade_level: string;
  department?: string;
  avatar_type?: string;
  avatar_color?: string;
  avatar_accessory?: string;
  current_status?: string;
  status_updated_at?: string;
  custom_status_id?: string;
};

type CustomStatus = {
  id: string;
  emoji: string;
  label: string;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
};

type QuizRecord = {
  id: string;
  best_score: number;
  best_time: number;
  perfect_score_count: number;
  activity: {
    title: string;
  };
};

type ActivityFeedItem = {
  id: string;
  activity_type: string;
  content: any;
  points_earned: number;
  created_at: string;
};

type Drawing = {
  id: string;
  title: string;
  drawing_data: string;
  is_shared: boolean;
  created_at: string;
};

type TimelineItem = {
  id: string;
  type: 'exploit' | 'drawing';
  created_at: string;
  data: ActivityFeedItem | Drawing;
};

export function ChildProfile({ childId, onBack, onStatusClick, onAvatarClick }: ChildProfileProps) {
  const { user, profile: currentProfile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [customStatus, setCustomStatus] = useState<CustomStatus | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [records, setRecords] = useState<QuizRecord[]>([]);
  const [exploits, setExploits] = useState<ActivityFeedItem[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [sharedDrawings, setSharedDrawings] = useState<Drawing[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestPending, setFriendRequestPending] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<string | null>(null);
  const [activityReactions, setActivityReactions] = useState<{[key: string]: {counts: {[key: string]: number}, userReactions: string[], activityId: string}}>({});

  useEffect(() => {
    loadProfileData();
    checkFriendshipStatus();
  }, [childId]);

  async function loadProfileData() {
    setLoading(true);
    try {
      console.log('Loading profile for childId:', childId);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', childId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      if (profile) {
        console.log('Profile data loaded:', profile);
        setProfileData(profile);

        // Load custom status if present
        if (profile.custom_status_id) {
          const { data: statusData } = await supabase
            .from('custom_statuses')
            .select('*')
            .eq('id', profile.custom_status_id)
            .single();

          if (statusData) {
            setCustomStatus(statusData);
          }
        } else {
          setCustomStatus(null);
        }
      } else {
        console.error('No profile found for id:', childId);
      }

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('score')
        .eq('child_id', childId)
        .eq('completed', true);

      if (progressError) console.error('Error loading progress:', progressError);
      const points = progressData?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
      setTotalPoints(points);

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('child_id', childId)
        .order('unlocked_at', { ascending: false })
        .limit(6);

      if (achievementsError) console.error('Error loading achievements:', achievementsError);
      console.log('Achievements loaded:', achievementsData);
      setAchievements(achievementsData || []);

      const { data: recordsData, error: recordsError } = await supabase
        .from('quiz_records')
        .select(`
          *,
          activity:activities(title)
        `)
        .eq('child_id', childId)
        .order('best_score', { ascending: false })
        .limit(5);

      if (recordsError) console.error('Error loading records:', recordsError);
      console.log('Records loaded:', recordsData);
      setRecords(recordsData || []);

      // Load exploits (special achievements from activity feed)
      const { data: exploitsData, error: exploitsError } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', childId)
        .in('activity_type', ['completed_quiz', 'record_broken', 'mystery_unlocked', 'achievement_unlocked'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (exploitsError) console.error('Error loading exploits:', exploitsError);
      console.log('Exploits loaded:', exploitsData);
      setExploits(exploitsData || []);

      // Load drawings
      const { data: drawingsData } = await supabase
        .from('drawings')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      setDrawings(drawingsData || []);
      const shared = (drawingsData || []).filter(d => d.is_shared);
      setSharedDrawings(shared);

      // Create timeline combining exploits and shared drawings
      const timelineItems: TimelineItem[] = [
        ...(exploitsData || []).map(exploit => ({
          id: exploit.id,
          type: 'exploit' as const,
          created_at: exploit.created_at,
          data: exploit
        })),
        ...shared.map(drawing => ({
          id: drawing.id,
          type: 'drawing' as const,
          created_at: drawing.created_at,
          data: drawing
        }))
      ];

      // Sort by date, most recent first
      timelineItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTimeline(timelineItems);

      // Load reactions for drawings
      await loadReactions(timelineItems);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReactions(items: TimelineItem[]) {
    const drawingItems = items.filter(i => i.type === 'drawing');

    for (const item of drawingItems) {
      const { data: activityData } = await supabase
        .from('activity_feed')
        .select('id')
        .eq('activity_type', 'drawing_shared')
        .contains('content', { drawing_id: item.id })
        .maybeSingle();

      if (activityData) {
        const { data: reactions } = await supabase
          .from('activity_reactions')
          .select('*')
          .eq('activity_id', activityData.id);

        const reactionCounts: { [key: string]: number } = {};
        reactions?.forEach(r => {
          reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
        });

        const userReactions = reactions?.filter(r => r.user_id === currentProfile?.id).map(r => r.reaction_type) || [];

        setActivityReactions(prev => ({
          ...prev,
          [item.id]: {
            counts: reactionCounts,
            userReactions,
            activityId: activityData.id
          }
        }));
      }
    }
  }

  async function toggleReaction(drawingId: string, reactionType: string) {
    if (!currentProfile) return;

    let reactionData = activityReactions[drawingId];

    if (!reactionData || !reactionData.activityId) {
      const { data: activityData } = await supabase
        .from('activity_feed')
        .select('id')
        .eq('activity_type', 'drawing_shared')
        .contains('content', { drawing_id: drawingId })
        .maybeSingle();

      if (!activityData) {
        console.error('Activity not found for drawing:', drawingId);
        return;
      }

      reactionData = {
        activityId: activityData.id,
        counts: {},
        userReactions: []
      };

      setActivityReactions(prev => ({
        ...prev,
        [drawingId]: reactionData
      }));
    }

    const hasReacted = reactionData.userReactions.includes(reactionType);

    if (hasReacted) {
      await supabase
        .from('activity_reactions')
        .delete()
        .eq('activity_id', reactionData.activityId)
        .eq('user_id', currentProfile.id)
        .eq('reaction_type', reactionType);
    } else {
      await supabase
        .from('activity_reactions')
        .insert({
          activity_id: reactionData.activityId,
          user_id: currentProfile.id,
          reaction_type: reactionType
        });
    }

    await loadReactions(timeline);
  }

  async function confirmDeleteDrawing() {
    if (!drawingToDelete) return;

    try {
      const { error } = await supabase
        .from('drawings')
        .delete()
        .eq('id', drawingToDelete);

      if (error) throw error;

      setDrawingToDelete(null);
      await loadProfileData();
    } catch (error) {
      console.error('Error deleting drawing:', error);
    }
  }

  async function toggleDrawingShare(drawingId: string, share: boolean) {
    try {
      const { error } = await supabase
        .from('drawings')
        .update({ is_shared: share })
        .eq('id', drawingId);

      if (error) throw error;

      await loadProfileData();
    } catch (error) {
      console.error('Error updating drawing share status:', error);
    }
  }

  async function checkFriendshipStatus() {
    if (!currentProfile) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${currentProfile.id},friend_id.eq.${childId}),and(user_id.eq.${childId},friend_id.eq.${currentProfile.id})`)
      .maybeSingle();

    if (error) console.error('Error checking friendship:', error);
    console.log('Friendship status:', data);

    if (data) {
      if (data.status === 'accepted') {
        setIsFriend(true);
        console.log('Users are friends!');
      } else if (data.status === 'pending') {
        setFriendRequestPending(true);
        console.log('Friend request pending');
      }
    } else {
      console.log('No friendship found');
    }
  }

  async function handleSendFriendRequest() {
    if (!currentProfile) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentProfile.id,
          friend_id: childId,
          status: 'pending'
        });

      if (error) throw error;

      setFriendRequestPending(true);
      alert('Demande d\'ami envoyée !');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  }

  function getStatusDisplay(status: string | undefined, isOwnProfile: boolean) {
    const statusConfig: { [key: string]: { emoji: string; text: string; color: string } } = {
      studying_math: { emoji: '🧮', text: 'En train de faire des maths', color: 'bg-blue-100 text-blue-700' },
      doing_homework: { emoji: '📚', text: 'En train de faire les devoirs', color: 'bg-green-100 text-green-700' },
      playing_games: { emoji: '🎮', text: 'En train de jouer aux jeux vidéo', color: 'bg-purple-100 text-purple-700' },
      reading: { emoji: '📖', text: 'En train de lire', color: 'bg-yellow-100 text-yellow-700' },
      sports: { emoji: '⚽', text: 'En train de faire du sport', color: 'bg-orange-100 text-orange-700' },
      resting: { emoji: '😴', text: 'En train de se reposer', color: 'bg-gray-100 text-gray-700' }
    };

    if (!status && !isOwnProfile) return null;

    const config = status ? statusConfig[status] : null;

    if (!status && isOwnProfile) {
      return (
        <button
          onClick={onStatusClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition font-medium cursor-pointer border-2 border-dashed border-gray-300"
        >
          <span className="text-xl">➕</span>
          <span>Ajouter un statut</span>
        </button>
      );
    }

    if (!config) return null;

    const content = (
      <>
        <span className="text-xl">{config.emoji}</span>
        <span>{config.text}</span>
      </>
    );

    if (isOwnProfile && onStatusClick) {
      return (
        <button
          onClick={onStatusClick}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.color} font-medium hover:opacity-80 transition cursor-pointer`}
        >
          {content}
        </button>
      );
    }

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.color} font-medium`}>
        {content}
      </div>
  );
}

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">Profil introuvable</p>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={onBack}
          className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-4 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex-shrink-0 relative">
              <AvatarDisplay
                userId={childId}
                fallbackName={profileData.full_name}
                size="lg"
              />
              {currentProfile?.id === childId && onAvatarClick && (
                <button
                  onClick={onAvatarClick}
                  className="absolute bottom-0 right-0 bg-white/90 hover:bg-white text-gray-500 rounded-full p-1 shadow-sm border border-gray-200 transition opacity-60 hover:opacity-100 hover:scale-110"
                  title="Personnaliser l'avatar"
                >
                  <Pencil size={10} />
                </button>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3 md:mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{profileData.full_name}</h1>
                  <p className="text-base md:text-lg text-gray-600">
                    Classe de {profileData.grade_level}
                    {profileData.department && ` • ${profileData.department}`}
                  </p>
                </div>

                {currentProfile && currentProfile.id !== childId && (
                  <>
                    {!isFriend && !friendRequestPending && (
                      <button
                        onClick={handleSendFriendRequest}
                        className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition font-semibold flex items-center gap-2 self-start md:self-auto"
                      >
                        <UserPlus size={20} />
                        Ajouter en ami
                      </button>
                    )}

                    {friendRequestPending && (
                      <div className="bg-gray-200 text-gray-600 px-6 py-3 rounded-full font-semibold self-start md:self-auto">
                        Demande envoyée
                      </div>
                    )}

                    {isFriend && (
                      <div className="bg-green-100 text-green-700 px-6 py-3 rounded-full font-semibold flex items-center gap-2 self-start md:self-auto">
                        <Trophy size={20} />
                        Ami
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="flex items-center gap-1.5 md:gap-2 bg-yellow-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-yellow-200">
                  <Star className="text-yellow-500" size={18} />
                  <span className="font-bold text-yellow-700 text-sm md:text-base">{totalPoints} points</span>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 bg-purple-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-purple-200">
                  <Trophy className="text-purple-500" size={18} />
                  <span className="font-bold text-purple-700 text-sm md:text-base">{achievements.length} succès</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {customStatus ? (
                  currentProfile?.id === childId && onStatusClick ? (
                    <button
                      onClick={onStatusClick}
                      className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-sm md:text-base font-medium hover:opacity-80 transition cursor-pointer"
                    >
                      <span className="text-xl md:text-2xl">{customStatus.emoji}</span>
                      <span>{customStatus.label}</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-sm md:text-base font-medium">
                      <span className="text-xl md:text-2xl">{customStatus.emoji}</span>
                      <span>{customStatus.label}</span>
                    </div>
                  )
                ) : currentProfile?.id === childId && onStatusClick ? (
                  <button
                    onClick={onStatusClick}
                    className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition text-sm md:text-base font-medium cursor-pointer border-2 border-dashed border-gray-300"
                  >
                    <span className="text-lg md:text-xl">➕</span>
                    <span>Ajouter un statut</span>
                  </button>
                ) : null}

                {currentProfile?.id === childId && (
                  <button
                    onClick={() => setShowDrawing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-sm md:text-base font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Palette size={18} className="md:w-[20px] md:h-[20px]" />
                    <span>Atelier de dessin</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 text-pink-600 shadow-inner">
                <Palette size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Classeur de dessins</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  Garde toutes tes œuvres au même endroit et partage tes favorites avec ta famille et tes amis.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 font-semibold">
                    <Sparkles size={16} /> {drawings.length} création{drawings.length > 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                    <Share2 size={16} /> {sharedDrawings.length} partagé{sharedDrawings.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {currentProfile?.id === childId && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setShowDrawing(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Palette size={18} />
                  Nouveau dessin
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            {drawings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {drawings.map((drawing) => (
                  <div key={drawing.id} className="bg-white border-2 border-pink-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div className="relative bg-gray-50">
                      <img src={drawing.drawing_data} alt={drawing.title} className="w-full h-56 object-contain" />
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow ${drawing.is_shared ? 'bg-purple-500 text-white' : 'bg-gray-800/80 text-white'}`}>
                          {drawing.is_shared ? <Share2 size={14} /> : <Lock size={14} />}
                          {drawing.is_shared ? 'Partagé' : 'Privé'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {drawing.title || 'Mon dessin'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {new Date(drawing.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      {currentProfile?.id === childId && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleDrawingShare(drawing.id, !drawing.is_shared)}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${drawing.is_shared ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                          >
                            <Share2 size={16} />
                            {drawing.is_shared ? 'Rendre privé' : 'Partager'}
                          </button>
                          <button
                            onClick={() => setDrawingToDelete(drawing.id)}
                            className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition inline-flex items-center gap-1"
                          >
                            <Trash2 size={16} />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-pink-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 flex items-center justify-center mb-4">
                  <Palette className="text-pink-500" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Ton classeur est vide pour l'instant</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Crée un premier dessin pour démarrer ta collection et le partager quand tu seras prêt.
                </p>
                {currentProfile?.id === childId && (
                  <button
                    onClick={() => setShowDrawing(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Palette size={18} />
                    Créer mon premier dessin
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Activités Récentes
          </h2>
          {timeline.length > 0 ? (
            <div className="space-y-4">
              {timeline.map((item) => {
                if (item.type === 'drawing') {
                  const drawing = item.data as Drawing;
                  const reactions = activityReactions[item.id];
                  return (
                    <div key={item.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:shadow-md transition">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                            <Palette className="text-pink-600" size={20} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-800">{drawing.title}</h3>
                            <div className="flex items-center gap-2">
                              {currentProfile?.id === childId && (
                                <button
                                  onClick={() => setDrawingToDelete(drawing.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Supprimer la publication"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(drawing.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 bg-white rounded-xl overflow-hidden border-2 border-gray-200">
                            <img
                              src={drawing.drawing_data}
                              alt={drawing.title}
                              className="w-full h-auto"
                            />
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => toggleReaction(item.id, 'like')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                  reactions?.userReactions.includes('like')
                                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                👍 {reactions?.counts.like || 0}
                              </button>

                              <button
                                onClick={() => toggleReaction(item.id, 'love')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                  reactions?.userReactions.includes('love')
                                    ? 'bg-red-100 text-red-600 border-2 border-red-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                ❤️ {reactions?.counts.love || 0}
                              </button>

                              <button
                                onClick={() => toggleReaction(item.id, 'celebrate')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                  reactions?.userReactions.includes('celebrate')
                                    ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                🎉 {reactions?.counts.celebrate || 0}
                              </button>

                              <button
                                onClick={() => toggleReaction(item.id, 'support')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                  reactions?.userReactions.includes('support')
                                    ? 'bg-green-100 text-green-600 border-2 border-green-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                💪 {reactions?.counts.support || 0}
                              </button>

                              <button
                                onClick={() => toggleReaction(item.id, 'applaud')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                  reactions?.userReactions.includes('applaud')
                                    ? 'bg-purple-100 text-purple-600 border-2 border-purple-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                👏 {reactions?.counts.applaud || 0}
                              </button>

                              <button
                                onClick={() => {
                                  if (navigator.share) {
                                    navigator.share({
                                      title: drawing.title,
                                      text: `Regarde ce dessin de ${profileData?.full_name}!`,
                                      url: window.location.href
                                    }).catch(() => {});
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition ml-auto"
                              >
                                <Share2 size={14} /> Partager
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const exploit = item.data as ActivityFeedItem;
                let icon = '⭐';
                let bgColor = 'from-yellow-50 to-orange-50';
                let borderColor = 'border-yellow-200';
                let title = exploit.content.message || exploit.content.title;

                if (exploit.activity_type === 'completed_quiz' && exploit.content.isPerfectScore) {
                  icon = '💯';
                  bgColor = 'from-yellow-50 to-yellow-100';
                  borderColor = 'border-yellow-300';
                } else if (exploit.activity_type === 'record_broken') {
                  icon = '🏆';
                  bgColor = 'from-red-50 to-orange-50';
                  borderColor = 'border-red-200';
                } else if (exploit.activity_type === 'mystery_unlocked') {
                  icon = '🎁';
                  bgColor = 'from-purple-50 to-pink-50';
                  borderColor = 'border-purple-200';
                } else if (exploit.activity_type === 'achievement_unlocked') {
                  icon = exploit.content.icon || '🏅';
                  bgColor = 'from-orange-50 to-yellow-50';
                  borderColor = 'border-orange-200';
                }

                return (
                  <div
                    key={item.id}
                    className={`bg-gradient-to-r ${bgColor} rounded-xl p-4 border-2 ${borderColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(exploit.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {exploit.points_earned > 0 && (
                            <span className="text-xs font-semibold text-yellow-600 flex items-center gap-1">
                              <Star size={12} />
                              +{exploit.points_earned}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="text-orange-500" />
              Succès Débloqués
            </h2>
            {achievements.length > 0 ? (
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucun succès débloqué pour le moment</p>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="text-blue-500" />
              Meilleurs Records
            </h2>
            {records.length > 0 ? (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200"
                  >
                    <h3 className="font-bold text-gray-800 mb-2">{record.activity.title}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-500" size={16} />
                        <span className="font-semibold">{record.best_score}%</span>
                      </div>
                      {record.best_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="text-blue-500" size={16} />
                          <span className="font-semibold">{Math.floor(record.best_time / 60)}:{(record.best_time % 60).toString().padStart(2, '0')}</span>
                        </div>
                      )}
                      {record.perfect_score_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Trophy className="text-orange-500" size={16} />
                          <span className="font-semibold">{record.perfect_score_count}x 100%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucun record pour le moment</p>
            )}
          </div>
        </div>

      </div>

      {showDrawing && (
        <DrawingCanvas
          childId={childId}
          onClose={() => setShowDrawing(false)}
          onSaved={() => {
            setShowDrawing(false);
            loadProfileData();
          }}
        />
      )}

      {drawingToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Supprimer le dessin ?</h3>
            <p className="text-gray-600 mb-6">
              Es-tu sûr de vouloir supprimer ce dessin ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDrawingToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteDrawing}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
