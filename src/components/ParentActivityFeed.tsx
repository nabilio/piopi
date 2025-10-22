import { useEffect, useState } from 'react';
import { Trophy, BookOpen, Target, Users, Star, Heart, MessageCircle, Award, TrendingUp, Clock, Calendar } from 'lucide-react';
import { supabase, Progress } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';

type Activity = {
  id: string;
  user_id: string;
  activity_type: string;
  content: any;
  points_earned: number;
  created_at: string;
  user_name?: string;
};

type ParentActivityFeedProps = {
  onClose?: () => void;
  onBack?: () => void;
  childId?: string;
  onProfileClick?: (profileId: string) => void;
};

export function ParentActivityFeed({ onClose, onBack, childId, onProfileClick }: ParentActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [childrenIds, setChildrenIds] = useState<string[]>([]);
  const [childStats, setChildStats] = useState<any>(null);
  const [recentProgress, setRecentProgress] = useState<Progress[]>([]);

  useEffect(() => {
    loadChildrenAndActivities();
    if (childId) {
      loadChildStats(childId);
    }
  }, [user, childId]);

  async function loadChildrenAndActivities() {
    if (!user) return;

    setLoading(true);

    let ids: string[];

    if (childId) {
      ids = [childId];
      setChildrenIds(ids);
    } else {
      const { data: children } = await supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', user.id);

      if (children && children.length > 0) {
        ids = children.map(c => c.id);
        setChildrenIds(ids);
      } else {
        setLoading(false);
        return;
      }
    }

    if (ids.length > 0) {
      console.log('Loading activities for children IDs:', ids);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .in('user_id', ids)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => f.friend_id) || [];
      const networkIds = [...ids, ...friendIds];
      console.log('Network IDs (children + friends):', networkIds);

      const { data: activities, error } = await supabase
        .from('activity_feed')
        .select('*')
        .in('user_id', networkIds)
        .neq('activity_type', 'friend_added')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Activities loaded:', activities?.length || 0, 'Error:', error);

      if (activities) {
        const userIds = [...new Set(activities.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const enrichedActivities = activities.map(activity => ({
          ...activity,
          user_name: profileMap.get(activity.user_id) || 'Utilisateur inconnu'
        }));

        setActivities(enrichedActivities);
      }
    }

    setLoading(false);
  }

  async function loadChildStats(childId: string) {
    const { data: progressData } = await supabase
      .from('progress')
      .select('*, activities(id, title, type, subject_id, subjects(name))')
      .eq('user_id', childId)
      .order('completed_at', { ascending: false });

    if (progressData) {
      const completed = progressData.filter(p => p.completed).length;
      const totalPoints = progressData.reduce((sum, p) => sum + (p.score || 0), 0);
      const totalTime = progressData.reduce((sum, p) => sum + (p.time_spent || 0), 0);

      setChildStats({
        totalActivities: progressData.length,
        completedActivities: completed,
        totalPoints,
        totalTimeSpent: totalTime
      });

      setRecentProgress(progressData.slice(0, 5));
    }
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? remainingMinutes + 'm' : ''}`;
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'completed_quiz': return <Trophy className="text-yellow-500" size={20} />;
      case 'completed_lesson': return <BookOpen className="text-blue-500" size={20} />;
      case 'earned_badge': return <Award className="text-purple-500" size={20} />;
      case 'level_up': return <Star className="text-pink-500" size={20} />;
      case 'new_friend': return <Users className="text-green-500" size={20} />;
      case 'liked_activity': return <Heart className="text-red-500" size={20} />;
      default: return <Target className="text-gray-500" size={20} />;
    }
  }

  function getActivityText(activity: Activity) {
    const isMyChild = childrenIds.includes(activity.user_id);
    const prefix = isMyChild ? '🧒 Votre enfant' : activity.user_name;

    switch (activity.activity_type) {
      case 'completed_quiz':
        const quizTitle = activity.content?.title || 'un quiz';
        const quizSubject = activity.content?.subject || '';
        return {
          main: `${prefix} a réussi ${quizTitle}`,
          detail: quizSubject ? `Matière : ${quizSubject}` : '',
          score: activity.content?.score || 0
        };
      case 'completed_lesson':
        const lessonTitle = activity.content?.title || 'une leçon';
        const lessonSubject = activity.content?.subject || '';
        return {
          main: `${prefix} a terminé ${lessonTitle}`,
          detail: lessonSubject ? `Matière : ${lessonSubject}` : '',
          score: activity.points_earned || 0
        };
      case 'earned_badge':
        return {
          main: `${prefix} a débloqué un badge`,
          detail: activity.content?.badge || 'Badge spécial',
          score: activity.points_earned || 0
        };
      case 'level_up':
        return {
          main: `${prefix} a progressé !`,
          detail: `Niveau ${activity.content?.level || ''} atteint`,
          score: activity.points_earned || 0
        };
      case 'new_friend':
        return {
          main: `${prefix} s'est fait un nouvel ami`,
          detail: 'Nouveau contact dans le réseau',
          score: 0
        };
      default:
        return {
          main: `${prefix} a une nouvelle activité`,
          detail: '',
          score: 0
        };
    }
  }

  function getTimeAgo(date: string) {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  }

  // Mode pleine page (quand onBack est fourni)
  // Si pas de onClose, on affiche toujours en mode pleine page
  if (onBack || !onClose) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700 flex items-center gap-2"
            >
              ← Retour
            </button>
          )}

          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Fil d'Activité</h2>
              <p className="text-sm text-gray-600">Activités récentes de votre enfant</p>
            </div>

            {childId && childStats && (
              <>
                <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
                  <h3 className="text-sm md:text-base font-bold text-gray-700 mb-3 md:mb-4">📊 Statistiques globales</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border-2 border-blue-100">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp size={16} className="text-blue-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-gray-700">Activités</span>
                      </div>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-blue-600 mb-1">
                        {childStats.completedActivities}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500">sur {childStats.totalActivities} complétées</p>
                    </div>

                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border-2 border-yellow-100">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Award size={16} className="text-yellow-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-gray-700">Points</span>
                      </div>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-yellow-600 mb-1">{childStats.totalPoints}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">points gagnés</p>
                    </div>

                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border-2 border-green-100">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Clock size={16} className="text-green-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-gray-700">Temps</span>
                      </div>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-green-600 mb-1">
                        {formatTime(childStats.totalTimeSpent)}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500">d'apprentissage</p>
                    </div>

                    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border-2 border-purple-100">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Trophy size={16} className="text-purple-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-gray-700">Progression</span>
                      </div>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-purple-600 mb-1">
                        {childStats.totalActivities > 0 ? Math.round((childStats.completedActivities / childStats.totalActivities) * 100) : 0}%
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500">de réussite</p>
                    </div>
                  </div>
                </div>

                {recentProgress.length > 0 && (
                  <div className="p-4 md:p-6 bg-white border-b border-gray-200">
                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      Historique d'activité récent
                    </h3>
                    <div className="space-y-2">
                      {recentProgress.slice(0, 5).map((progress) => {
                        const activity = (progress as any).activities;
                        const activityTitle = activity?.title || 'Activité inconnue';
                        const subjectName = activity?.subjects?.name || '';
                        const completedDate = new Date(progress.completed_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        const activityType = activity?.type || 'unknown';
                        const typeLabels: Record<string, string> = {
                          'lesson': '📖 Leçon',
                          'quiz': '❓ Quiz',
                          'exercise': '✏️ Exercice',
                          'video': '🎥 Vidéo'
                        };
                        const typeLabel = typeLabels[activityType] || '📚 Activité';

                        return (
                          <div
                            key={progress.id}
                            className={`rounded-lg p-3 md:p-4 border-l-4 ${
                              progress.completed
                                ? 'bg-green-50 border-green-500'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                              <div className="flex items-start gap-2 md:gap-3 flex-1">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">{typeLabel}</span>
                                    {subjectName && (
                                      <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full font-medium text-gray-700">
                                        {subjectName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold text-gray-800">{activityTitle}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full whitespace-nowrap ml-2 ${
                                progress.completed
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }`}>
                                {progress.completed ? '✓ Terminé' : '🔄 En cours'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-3 text-xs">
                              <div className="bg-white/60 rounded-lg px-2 md:px-3 py-1.5 md:py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Score</div>
                                <div className="font-bold text-orange-600 text-sm md:text-base">{progress.score} pts</div>
                              </div>
                              <div className="bg-white/60 rounded-lg px-2 md:px-3 py-1.5 md:py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Durée</div>
                                <div className="font-bold text-blue-600 text-sm md:text-base">{formatTime(progress.time_spent || 0)}</div>
                              </div>
                              <div className="bg-white/60 rounded-lg px-2 md:px-3 py-1.5 md:py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Date</div>
                                <div className="font-bold text-gray-700 text-[10px] md:text-xs">{completedDate}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Chargement des activités...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const activityInfo = getActivityText(activity);
                    return (
                      <div key={activity.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                            {getActivityIcon(activity.activity_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 font-bold text-sm mb-1">{activityInfo.main}</p>
                            {activityInfo.detail && (
                              <p className="text-xs text-gray-600 mb-2">{activityInfo.detail}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                🕐 {getTimeAgo(activity.created_at)}
                              </span>
                              {activityInfo.score > 0 && (
                                <span className="text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-yellow-500 px-3 py-1 rounded-full">
                                  ⭐ {activityInfo.score} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode modal (quand onClose est fourni)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Fil d'Actualité</h2>
            <p className="text-sm text-gray-600">Activités de vos enfants et leur réseau</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des activités...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucune activité récente</p>
              <p className="text-sm text-gray-500 mt-2">
                Les activités de vos enfants et leurs amis apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map(activity => (
                <div
                  key={activity.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onProfileClick?.(activity.user_id)}
                      className="flex-shrink-0 hover:opacity-80 transition"
                    >
                      <AvatarDisplay
                        userId={activity.user_id}
                        fallbackName={activity.user_name}
                        size="sm"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm">
                        <button
                          onClick={() => onProfileClick?.(activity.user_id)}
                          className="font-semibold hover:text-blue-600 transition"
                        >
                          {activity.user_name}
                        </button>{' '}
                        {getActivityText(activity).replace(activity.user_name || '', '')}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(activity.created_at)}
                        </span>
                        {activity.points_earned > 0 && (
                          <span className="text-xs text-yellow-600 font-semibold">
                            +{activity.points_earned} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
