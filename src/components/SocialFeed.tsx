import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trophy, Star, TrendingUp, Users, Palette, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { DrawingDisplay } from './DrawingDisplay';

type ActivityItem = {
  id: string;
  user_id: string;
  activity_type: string;
  content: any;
  points_earned: number;
  created_at: string;
  user?: {
    full_name: string;
  };
  reactions?: Reaction[];
  reaction_counts?: { [key: string]: number };
  user_reactions?: string[];
};

type Reaction = {
  id: string;
  user_id: string;
  activity_id: string;
  reaction_type: string;
  created_at: string;
};

type SocialFeedProps = {
  onProfileClick?: (profileId: string) => void;
};

export function SocialFeed({ onProfileClick }: SocialFeedProps = {}) {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadActivityFeed();
    }
  }, [profile]);

  async function loadActivityFeed() {
    try {
      // Load all activities from all users (not filtered by friends)
      // Exclude friend_added activities
      const query = supabase
        .from('activity_feed')
        .select(`
          *,
          user:profiles!activity_feed_user_id_fkey(full_name)
        `)
        .neq('activity_type', 'friend_added')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;

      if (error) throw error;

      const activitiesWithReactions = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: reactions } = await supabase
            .from('activity_reactions')
            .select('*')
            .eq('activity_id', activity.id);

          const reactionCounts: { [key: string]: number } = {};
          reactions?.forEach(r => {
            reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
          });

          const userReactions = reactions?.filter(r => r.user_id === profile?.id).map(r => r.reaction_type) || [];

          return {
            ...activity,
            reactions,
            reaction_counts: reactionCounts,
            user_reactions: userReactions
          };
        })
      );

      setActivities(activitiesWithReactions);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReaction(activityId: string, reactionType: string) {
    if (!profile) return;

    try {
      const activity = activities.find(a => a.id === activityId);
      const hasThisReaction = activity?.user_reactions?.includes(reactionType);

      if (hasThisReaction) {
        await supabase
          .from('activity_reactions')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', profile.id)
          .eq('reaction_type', reactionType);
      } else {
        await supabase
          .from('activity_reactions')
          .insert({
            activity_id: activityId,
            user_id: profile.id,
            reaction_type: reactionType
          });
      }

      await loadActivityFeed();
    } catch (error) {
      // Silently handle errors and reload feed anyway
      await loadActivityFeed();
    }
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'completed_quiz':
        return <Star className="text-yellow-500" size={24} />;
      case 'completed_activity':
        return <Trophy className="text-blue-500" size={24} />;
      case 'achievement_unlocked':
        return <Trophy className="text-orange-500" size={24} />;
      case 'level_up':
        return <TrendingUp className="text-green-500" size={24} />;
      case 'friend_added':
        return <Users className="text-pink-500" size={24} />;
      case 'record_broken':
        return <TrendingUp className="text-red-500" size={24} />;
      case 'mystery_unlocked':
        return <Star className="text-purple-500" size={24} />;
      case 'drawing_shared':
        return <Palette className="text-pink-500" size={24} />;
      case 'story_created':
        return <Share2 className="text-purple-500" size={24} />;
      case 'battle_won':
        return <Trophy className="text-yellow-500" size={24} />;
      case 'battle_lost':
        return <Trophy className="text-gray-500" size={24} />;
      case 'battle_draw':
        return <Trophy className="text-blue-500" size={24} />;
      case 'battle_started':
        return <Trophy className="text-orange-500" size={24} />;
      default:
        return <Star className="text-gray-500" size={24} />;
    }
  }

  function getActivityText(activity: ActivityItem) {
    const userName = activity.user?.full_name || 'Un utilisateur';

    switch (activity.activity_type) {
      case 'completed_quiz':
        return activity.content.message || `${userName} a réussi "${activity.content.title}" avec un score parfait !`;
      case 'completed_activity':
        return `${userName} a terminé l'activité "${activity.content.title}"`;
      case 'achievement_unlocked':
        return `${userName} a débloqué "${activity.content.title}"`;
      case 'level_up':
        return `${userName} est passé au niveau ${activity.content.level}`;
      case 'friend_added':
        return `${userName} a ajouté un nouvel ami`;
      case 'record_broken':
        return activity.content.message || `${userName} a battu un record sur "${activity.content.title}" !`;
      case 'mystery_unlocked':
        return activity.content.message || `${userName} a débloqué la surprise mystère de "${activity.content.title}" !`;
      case 'drawing_shared':
        return `${userName} a partagé un nouveau dessin`;
      case 'story_created':
        return activity.content.description || `${userName} a créé une nouvelle histoire : "${activity.content.story_title || 'Sans titre'}"`;
      case 'battle_won':
      case 'battle_lost':
      case 'battle_draw':
      case 'battle_started':
        return activity.content.description || `${userName} a participé à un battle`;
      default:
        return `${userName} a une nouvelle activité`;
    }
  }

  function getTimeAgo(date: string) {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return activityDate.toLocaleDateString('fr-FR');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Users size={64} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">Pas encore d'activités</h3>
        <p className="text-gray-500">Les activités de tous les utilisateurs apparaîtront ici</p>
      </div>
    );
  }

  const latestDrawing = activities.find(a => a.activity_type === 'drawing_shared');
  const otherActivities = activities.filter(a => a.activity_type !== 'drawing_shared' || a.id !== latestDrawing?.id);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Fil d'Actualité</h2>

      {/* Featured Latest Drawing */}
      {latestDrawing && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-pink-200">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="text-pink-600" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Dernier dessin partagé</h3>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => onProfileClick?.(latestDrawing.user_id)}
                className="flex-shrink-0 hover:opacity-80 transition"
              >
                <AvatarDisplay
                  userId={latestDrawing.user_id}
                  fallbackName={latestDrawing.user?.full_name}
                  size="sm"
                />
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-800 font-medium">
                    <button
                      onClick={() => onProfileClick?.(latestDrawing.user_id)}
                      className="font-semibold hover:text-blue-600 transition"
                    >
                      {latestDrawing.user?.full_name}
                    </button>{' '}
                    a partagé un dessin
                  </p>
                  <span className="text-sm text-gray-500">{getTimeAgo(latestDrawing.created_at)}</span>
                </div>

                {latestDrawing.content?.drawing_id && (
                  <DrawingDisplay drawingId={latestDrawing.content.drawing_id} title={latestDrawing.content.title} />
                )}

                {/* Reactions section */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => toggleReaction(latestDrawing.id, 'like')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        latestDrawing.user_reactions?.includes('like')
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      👍 {latestDrawing.reaction_counts?.like || 0}
                    </button>

                    <button
                      onClick={() => toggleReaction(latestDrawing.id, 'love')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        latestDrawing.user_reactions?.includes('love')
                          ? 'bg-red-100 text-red-600 border-2 border-red-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ❤️ {latestDrawing.reaction_counts?.love || 0}
                    </button>

                    <button
                      onClick={() => toggleReaction(latestDrawing.id, 'celebrate')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        latestDrawing.user_reactions?.includes('celebrate')
                          ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🎉 {latestDrawing.reaction_counts?.celebrate || 0}
                    </button>

                    <button
                      onClick={() => toggleReaction(latestDrawing.id, 'support')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        latestDrawing.user_reactions?.includes('support')
                          ? 'bg-green-100 text-green-600 border-2 border-green-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      💪 {latestDrawing.reaction_counts?.support || 0}
                    </button>

                    <button
                      onClick={() => toggleReaction(latestDrawing.id, 'applaud')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        latestDrawing.user_reactions?.includes('applaud')
                          ? 'bg-purple-100 text-purple-600 border-2 border-purple-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      👏 {latestDrawing.reaction_counts?.applaud || 0}
                    </button>

                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: latestDrawing.content.title || 'Dessin partagé',
                            text: `Regarde ce dessin de ${latestDrawing.user?.full_name}!`,
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
        </div>
      )}

      {otherActivities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition"
        >
          <div className="flex items-start gap-4">
            <button
              onClick={() => onProfileClick?.(activity.user_id)}
              className="flex-shrink-0 hover:opacity-80 transition"
            >
              <AvatarDisplay
                userId={activity.user_id}
                fallbackName={activity.user?.full_name}
                size="sm"
              />
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.activity_type)}
                  <p className="text-gray-800 font-medium">
                    <button
                      onClick={() => onProfileClick?.(activity.user_id)}
                      className="font-semibold hover:text-blue-600 transition"
                    >
                      {activity.user?.full_name}
                    </button>{' '}
                    {getActivityText(activity).replace(activity.user?.full_name || '', '')}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{getTimeAgo(activity.created_at)}</span>
              </div>

              {activity.points_earned > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-600">
                    +{activity.points_earned} points
                  </span>
                </div>
              )}

              {activity.content.score !== undefined && (
                <div className="mt-2 text-sm text-gray-600">
                  Score: {activity.content.score}%
                </div>
              )}

              {/* Drawing display for drawing_shared activities */}
              {activity.activity_type === 'drawing_shared' && activity.content?.drawing_id && (
                <DrawingDisplay drawingId={activity.content.drawing_id} title={activity.content.title} />
              )}

              {/* Reactions section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => toggleReaction(activity.id, 'like')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activity.user_reactions?.includes('like')
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👍 {activity.reaction_counts?.like || 0}
                  </button>

                  <button
                    onClick={() => toggleReaction(activity.id, 'love')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activity.user_reactions?.includes('love')
                        ? 'bg-red-100 text-red-600 border-2 border-red-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ❤️ {activity.reaction_counts?.love || 0}
                  </button>

                  <button
                    onClick={() => toggleReaction(activity.id, 'celebrate')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activity.user_reactions?.includes('celebrate')
                        ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🎉 {activity.reaction_counts?.celebrate || 0}
                  </button>

                  <button
                    onClick={() => toggleReaction(activity.id, 'support')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activity.user_reactions?.includes('support')
                        ? 'bg-green-100 text-green-600 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    💪 {activity.reaction_counts?.support || 0}
                  </button>

                  <button
                    onClick={() => toggleReaction(activity.id, 'applaud')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activity.user_reactions?.includes('applaud')
                        ? 'bg-purple-100 text-purple-600 border-2 border-purple-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👏 {activity.reaction_counts?.applaud || 0}
                  </button>

                  {activity.activity_type === 'drawing_shared' && (
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: activity.content.title || 'Dessin partagé',
                            text: `Regarde ce dessin de ${activity.user?.full_name}!`,
                            url: window.location.href
                          }).catch(() => {});
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition ml-auto"
                    >
                      <Share2 size={14} /> Partager
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
