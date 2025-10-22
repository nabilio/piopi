import { useEffect, useState } from 'react';
import { ArrowLeft, Users, TrendingUp, Clock, Award, Calendar, CalendarHeart, UserPlus, Book, BookPlus, CreditCard, Plus } from 'lucide-react';
import { supabase, Profile, Progress } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AddChildModal } from './AddChildModal';
import { ParentNotifications } from './ParentNotifications';
import { StoriesLibrary } from './StoriesLibrary';
import { CustomLessonsManager } from './CustomLessonsManager';

type ParentDashboardProps = {
  onBack: () => void;
  onAddChild: () => void;
  onViewActivity?: (childId: string) => void;
  onProfileClick?: (profileId: string) => void;
  onNavigate?: (view: string) => void;
};

type ChildStats = {
  child: Profile;
  totalActivities: number;
  completedActivities: number;
  totalPoints: number;
  totalTimeSpent: number;
  recentProgress: Progress[];
};

export function ParentDashboard({ onBack, onAddChild, onViewActivity, onProfileClick, onNavigate }: ParentDashboardProps) {
  const { user, switchToChildProfile } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [childrenStats, setChildrenStats] = useState<ChildStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showStoriesFor, setShowStoriesFor] = useState<string | null>(null);
  const [showCustomLessonsFor, setShowCustomLessonsFor] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadSubscription();
    }
  }, [user]);

  async function loadSubscription() {
    if (!user) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading subscription:', error);
    }

    setSubscription(data);
  }

  const getMaxChildren = () => {
    if (!subscription) return 1;
    const planLimits: Record<string, number> = {
      'basic': 1,
      'duo': 2,
      'family': 3,
      'premium': 4,
      'liberte': 999
    };
    return planLimits[subscription.plan_type] || subscription.children_count || 1;
  };

  const canAddMoreChildren = () => {
    if (!subscription) return false;
    const maxChildren = getMaxChildren();
    return children.length < maxChildren;
  };

  const isMaximumPlan = () => {
    if (!subscription) return false;
    return subscription.plan_type === 'liberte';
  };

  async function loadDashboardData() {
    if (!user) return;

    setLoading(true);

    const { data: childrenData, error: childrenError } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', user.id);

    if (childrenError) {
      console.error('Error loading children:', childrenError);
      setLoading(false);
      return;
    }

    setChildren(childrenData || []);

    const stats: ChildStats[] = [];

    for (const child of childrenData || []) {
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select(`
          *,
          activities (
            title,
            type,
            subject_id,
            subjects (
              name
            )
          )
        `)
        .eq('child_id', child.id)
        .order('completed_at', { ascending: false });

      if (progressError) {
        console.error('Error loading progress:', progressError);
        continue;
      }

      const completed = progressData?.filter((p) => p.completed) || [];
      const totalPoints = completed.reduce((sum, p) => sum + (p.score || 0), 0);
      const totalTimeSpent = progressData?.reduce((sum, p) => sum + (p.time_spent || 0), 0) || 0;

      stats.push({
        child,
        totalActivities: progressData?.length || 0,
        completedActivities: completed.length,
        totalPoints,
        totalTimeSpent,
        recentProgress: progressData?.slice(0, 5) || [],
      });
    }

    setChildrenStats(stats);
    setLoading(false);
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  if (showCustomLessonsFor) {
    const selectedChild = children.find(c => c.id === showCustomLessonsFor);
    return (
      <CustomLessonsManager
        onClose={() => setShowCustomLessonsFor(null)}
        preselectedChildId={showCustomLessonsFor}
        preselectedChildName={selectedChild?.full_name || ''}
      />
    );
  }

  if (showStoriesFor) {
    return <StoriesLibrary childId={showStoriesFor} onClose={() => setShowStoriesFor(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Tableau de bord parent
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Suivez les progrès de vos enfants</p>
            </div>
            {subscription && children.length > 0 && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2.5 rounded-lg border-2 border-blue-200">
                      <Users size={18} className="text-blue-600" />
                      <div className="text-sm font-semibold">
                        <span className="text-gray-800">{children.length}</span>
                        {getMaxChildren() !== 999 && (
                          <>
                            <span className="text-gray-600"> / </span>
                            <span className="text-gray-800">{getMaxChildren()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsAddChildModalOpen(true)}
                      disabled={!canAddMoreChildren()}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-semibold transition shadow-md ${
                        canAddMoreChildren()
                          ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                          : 'bg-white border-2 border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={18} />
                      Ajouter un enfant
                    </button>
                  </div>
                  {!canAddMoreChildren() && (
                    <button
                      onClick={() => onNavigate && onNavigate('add-child-upgrade')}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold underline cursor-pointer"
                    >
                      Upgrade requis pour ajout de plus d'enfants
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement des données...</p>
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="text-5xl sm:text-6xl mb-4">👶</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-700 mb-2">Aucun enfant enregistré</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Commencez par ajouter le profil de votre premier enfant.
            </p>
            {canAddMoreChildren() ? (
              <button
                onClick={onAddChild}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold transition"
              >
                <UserPlus size={18} className="sm:w-5 sm:h-5" />
                Ajouter un enfant
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Vous avez atteint la limite de votre abonnement</p>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('add-child-upgrade');
                    }
                  }}
                  className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
                >
                  Ajouter un enfant (upgrade requis)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-600 shadow">
                  <CalendarHeart size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Gestion des anniversaires</h3>
                  <p className="text-sm text-gray-600">Consultez les invitations et les dates à venir pour tous vos enfants.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('parent-birthdays')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow transition hover:bg-purple-50"
              >
                <CalendarHeart size={18} />
                Ouvrir le suivi
              </button>
            </div>
            {childrenStats.map((stats) => (
              <div key={stats.child.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg sm:text-xl lg:text-2xl font-bold flex-shrink-0">
                      {stats.child.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">{stats.child.full_name}</h2>
                      <p className="text-sm sm:text-base text-gray-600">{stats.child.age} ans</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => setShowCustomLessonsFor(stats.child.id)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-2 md:px-5 py-2 md:py-2.5 text-xs md:text-sm rounded-lg font-semibold hover:from-violet-600 hover:to-purple-600 transition shadow-lg flex items-center justify-center gap-1 md:gap-1.5 flex-1"
                    >
                      <BookPlus size={14} className="md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Cours perso</span>
                      <span className="sm:hidden text-[10px]">Cours</span>
                    </button>
                    <button
                      onClick={() => setShowStoriesFor(stats.child.id)}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 md:px-5 py-2 md:py-2.5 text-xs md:text-sm rounded-lg font-semibold hover:from-amber-600 hover:to-yellow-600 transition shadow-lg flex items-center justify-center gap-1 md:gap-1.5 flex-1"
                    >
                      <Book size={14} className="md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Histoires</span>
                      <span className="sm:hidden text-[10px]">Stories</span>
                    </button>
                    {onViewActivity && (
                      <button
                        onClick={() => onViewActivity(stats.child.id)}
                        className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-2 md:px-5 py-2 md:py-2.5 text-xs md:text-sm rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition shadow-lg flex items-center justify-center gap-1 md:gap-1.5 flex-1"
                      >
                        <TrendingUp size={14} className="md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Voir activité</span>
                        <span className="sm:hidden text-[10px]">Activité</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 hidden md:block">
                  <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-3 sm:mb-4">📊 Statistiques globales</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-blue-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp size={16} className="text-blue-600" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Activités</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600 mb-1">
                        {stats.completedActivities}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">sur {stats.totalActivities} complétées</p>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-yellow-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Award size={16} className="text-yellow-600" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Points</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-black text-yellow-600 mb-1">{stats.totalPoints}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">points gagnés</p>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-green-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Clock size={16} className="text-green-600" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Temps</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-black text-green-600 mb-1">
                        {formatTime(stats.totalTimeSpent)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">d'apprentissage total</p>
                    </div>

                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-purple-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <TrendingUp size={16} className="text-purple-600" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Progression</span>
                      </div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 mb-1">
                        {stats.totalActivities > 0
                          ? Math.round((stats.completedActivities / stats.totalActivities) * 100)
                          : 0}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">de réussite globale</p>
                    </div>
                  </div>
                </div>

                {stats.recentProgress.length > 0 && (
                  <div className="hidden md:block">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      Historique d'activité récent
                    </h3>
                    <div className="space-y-2">
                      {stats.recentProgress.slice(0, 3).map((progress) => {
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
                            className={`rounded-lg p-4 border-l-4 ${
                              progress.completed
                                ? 'bg-green-50 border-green-500'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">{typeLabel}</span>
                                    {subjectName && (
                                      <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full font-medium text-gray-700">
                                        {subjectName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold text-gray-800">
                                    {activityTitle}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ml-2 ${
                                progress.completed
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }`}>
                                {progress.completed ? '✓ Terminé' : '🔄 En cours'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Score</div>
                                <div className="font-bold text-orange-600 text-base">{progress.score} pts</div>
                              </div>
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Durée</div>
                                <div className="font-bold text-blue-600 text-base">{formatTime(progress.time_spent || 0)}</div>
                              </div>
                              <div className="bg-white/60 rounded-lg px-3 py-2">
                                <div className="text-gray-500 mb-0.5 font-medium">Date</div>
                                <div className="font-bold text-gray-700 text-xs">{completedDate}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {children.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-6 hidden md:block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Book size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Histoires Personnalisées</h3>
                    <p className="text-gray-600">Créez des histoires uniques pour vos enfants</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setShowStoriesFor(child.id)}
                      className="group bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl shadow-md hover:shadow-xl p-4 transition transform hover:scale-105 text-left border-2 border-transparent hover:border-amber-300"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          {child.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 group-hover:text-amber-600 transition">
                            {child.full_name}
                          </p>
                          <p className="text-xs text-gray-600">Voir les histoires</p>
                        </div>
                        <Book size={20} className="text-amber-500 group-hover:scale-110 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              {canAddMoreChildren() ? (
                <button
                  onClick={onAddChild}
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold transition shadow-lg"
                >
                  <UserPlus size={18} className="sm:w-5 sm:h-5" />
                  Ajouter un enfant
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('add-child-upgrade');
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-white hover:bg-purple-50 border-2 border-purple-500 text-purple-600 hover:text-purple-700 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold transition"
                >
                  <CreditCard size={18} className="sm:w-5 sm:h-5" />
                  <span>Ajouter un enfant <span className="text-xs opacity-75">(upgrade requis)</span></span>
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
        existingChildrenCount={children.length}
        maxChildren={getMaxChildren()}
        planType={subscription?.plan_type}
        onSuccess={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
}
