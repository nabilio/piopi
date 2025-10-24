import { useEffect, useState, type ReactNode } from 'react';
import { Rocket, Star, BookOpen, Trophy, UserPlus, Plus, ArrowLeft, ArrowRight, Sword, Swords, User, Book, Sparkles, Bot, BookPlus, Palette, Share2 } from 'lucide-react';
import { supabase, Subject, Profile } from '../lib/supabase';
import { SubjectCard } from './SubjectCard';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { useBirthdayCompletion } from '../hooks/useBirthdayCompletion';
import { AvatarDisplay } from './AvatarDisplay';
import { BattleSetup } from './BattleSetup';
import { BattleHub } from './BattleHub';
import { Logo } from './Logo';
import { StoriesLibrary } from './StoriesLibrary';
import { CustomLessonsChild } from './CustomLessonsChild';
import { BirthdayNotificationCard } from './BirthdayNotificationCard';
import { ChildBirthdayModal } from './ChildBirthdayModal';

type HomePageProps = {
  onSubjectSelect: (subject: Subject) => void;
  onCoachClick: () => void;
  onProfileClick?: (profileId: string) => void;
  onAvatarClick?: () => void;
  onBattleClick?: () => void;
  onCoursesClick?: () => void;
  onBattleCreated?: (battleId: string) => void;
  onStoriesClick?: () => void;
  onNetworkClick?: () => void;
};

type FeaturePanelProps = {
  title: string;
  description: string;
  icon: ReactNode;
  accentGradient: string;
  onClick?: () => void | Promise<void>;
  badge?: ReactNode;
  cta?: string;
  stats?: ReactNode;
  disabled?: boolean;
  className?: string;
};

function NotificationBadge({ count, gradient = 'from-red-500 via-pink-500 to-orange-400' }: { count: number; gradient?: string }) {
  return (
    <div className="relative shrink-0">
      <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-gradient-to-br from-white/0 via-white/40 to-white/0 blur-xl" />
      <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white text-sm font-bold shadow-lg`}>{count}</div>
    </div>
  );
}

function FeaturePanel({
  title,
  description,
  icon,
  accentGradient,
  onClick,
  badge,
  cta,
  stats,
  disabled = false,
  className = ''
}: FeaturePanelProps) {
  const clickable = Boolean(onClick) && !disabled;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.4)] transition-all ${
        clickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_35px_70px_-30px_rgba(15,23,42,0.45)]' : 'cursor-default'
      } ${disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
      onClick={clickable ? () => onClick?.() : undefined}
    >
      <div className={`pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-gradient-to-br ${accentGradient} opacity-60 blur-3xl`} />
      <div className={`pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-gradient-to-tr ${accentGradient} opacity-40 blur-2xl`} />
      <div className="pointer-events-none absolute inset-0 bg-white/40 mix-blend-soft-light" />

      <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br ${accentGradient} text-white shadow-lg`}>{icon}</div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          </div>
          {badge}
        </div>

        {stats ? <div className="flex flex-col gap-2 text-sm text-slate-700">{stats}</div> : null}

        {cta ? (
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{cta}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HomePage({ onSubjectSelect, onCoachClick, onProfileClick, onAvatarClick, onBattleClick, onCoursesClick = () => {}, onBattleCreated, onStoriesClick = () => {} }: HomePageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { profile, user, refreshProfile } = useAuth();
  const { totalPoints } = useGamification();
  const birthdayCompletion = useBirthdayCompletion(profile, refreshProfile);
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [childPoints, setChildPoints] = useState(0);
  const [activeBattlesCount, setActiveBattlesCount] = useState(0);
  const [battleWins, setBattleWins] = useState(0);
  const [unreadBattleNotifications, setUnreadBattleNotifications] = useState(0);
  const [unreadStoriesCount, setUnreadStoriesCount] = useState(0);
  const [newCustomLessonsCount, setNewCustomLessonsCount] = useState(0);
  const [unreadFriendRequests, setUnreadFriendRequests] = useState(0);
  const [showStories, setShowStories] = useState(false);
  const [showCustomLessons, setShowCustomLessons] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildData, setNewChildData] = useState({ full_name: '', age: '', grade_level: '' });
  const [addingChild, setAddingChild] = useState(false);
  const [adminViewLevel, setAdminViewLevel] = useState<string | null>(null);
  const [showDrawingStudio, setShowDrawingStudio] = useState(false);
  const [drawingStats, setDrawingStats] = useState({ total: 0, shared: 0 });

  const currentChildId = selectedChild?.id || profile?.id || null;

  const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

  useEffect(() => {
    loadSubjects();
    if (profile?.role === 'parent') {
      loadChildren();
    }
    loadBattleStats();
    loadUnreadBattleNotifications();
    loadUnreadStories();
    loadNewCustomLessons();
    loadUnreadFriendRequests();
    loadDrawingStats();

    const currentUserId = currentChildId;
    if (!currentUserId) return;

    const notificationSubscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`
      }, () => {
        loadUnreadBattleNotifications();
        loadUnreadFriendRequests();
      })
      .subscribe();

    const battleSubscription = supabase
      .channel('battles_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battles'
      }, () => {
        loadUnreadBattleNotifications();
      })
      .subscribe();

    const storiesSubscription = supabase
      .channel('stories_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories',
        filter: `child_id=eq.${currentUserId}`
      }, () => {
        loadUnreadStories();
      })
      .subscribe();

    const lessonsSubscription = supabase
      .channel('custom_lessons_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_lessons',
        filter: `child_id=eq.${currentUserId}`
      }, () => {
        loadNewCustomLessons();
      })
      .subscribe();

    return () => {
      notificationSubscription.unsubscribe();
      battleSubscription.unsubscribe();
      storiesSubscription.unsubscribe();
      lessonsSubscription.unsubscribe();
    };
  }, [profile, selectedChild, adminViewLevel]);

  useEffect(() => {
    loadDrawingStats();
  }, [currentChildId]);

  async function loadBattleStats() {
    const currentUserId = currentChildId;
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('battles')
      .select('id, creator_id, opponent_id, winner_id, status')
      .or(`creator_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
      .eq('status', 'completed');

    if (!error && data) {
      const wins = data.filter(b => b.winner_id === currentUserId).length;
      setBattleWins(wins);
    }
  }

  async function loadUnreadBattleNotifications() {
    const currentUserId = currentChildId;
    if (!currentUserId) return;
    console.log('🔔 Loading battle notifications for user:', currentUserId);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('last_battle_hub_visit')
      .eq('id', currentUserId)
      .single();

    const lastVisit = profileData?.last_battle_hub_visit;
    console.log('📅 Last Battle Hub visit:', lastVisit);
    let count = 0;

    const { data: battleNotifications, error: notifError } = await supabase
      .from('battle_notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .is('read_at', null);

    console.log('📬 Battle notifications:', battleNotifications, 'Error:', notifError);

    if (lastVisit && battleNotifications) {
      const newNotifs = battleNotifications.filter(n => new Date(n.created_at) > new Date(lastVisit));
      count += newNotifs.length;
      console.log('✨ New notifications since last visit:', newNotifs.length);
    } else if (battleNotifications) {
      count += battleNotifications.length;
      console.log('📮 Total unread battle notifications:', battleNotifications.length);
    }

    const { data: friendRequests } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('type', 'friend_request')
      .eq('read', false);

    if (friendRequests) {
      console.log('👥 Unread friend requests:', friendRequests.length);
    }

    const now = new Date();
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const { data: acceptedBattles } = await supabase
      .from('battles')
      .select('expires_at')
      .or(`creator_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
      .eq('status', 'accepted')
      .lt('expires_at', twentyMinutesFromNow.toISOString());

    if (acceptedBattles) {
      count += acceptedBattles.length;
      console.log('⏰ Urgent accepted battles (< 20min):', acceptedBattles.length);
    }

    const { data: pendingBattles } = await supabase
      .from('battles')
      .select('expires_at')
      .eq('opponent_id', currentUserId)
      .eq('status', 'pending')
      .lt('expires_at', oneHourFromNow.toISOString());

    if (pendingBattles) {
      count += pendingBattles.length;
      console.log('⏱️ Urgent pending invitations (< 1h):', pendingBattles.length);
    }

    console.log('🎯 Total battle notifications:', count);
    setUnreadBattleNotifications(count);
  }

  async function loadUnreadStories() {
    const currentUserId = currentChildId;
    if (!currentUserId) return;

    console.log('📖 Loading stories for user:', currentUserId);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('last_stories_visit')
      .eq('id', currentUserId)
      .maybeSingle();

    const lastVisit = profileData?.last_stories_visit;
    console.log('📅 Last stories visit:', lastVisit);

    const { data: stories } = await supabase
      .from('stories')
      .select('id, created_at')
      .eq('child_id', currentUserId);

    console.log('📚 Total stories:', stories?.length);

    if (stories) {
      if (lastVisit) {
        const newStories = stories.filter(s => new Date(s.created_at) > new Date(lastVisit));
        console.log('✨ New stories since last visit:', newStories.length);
        setUnreadStoriesCount(newStories.length);
      } else {
        console.log('⚠️ No last visit recorded, showing all stories');
        setUnreadStoriesCount(stories.length);
      }
    }
  }

  async function loadNewCustomLessons() {
    const currentUserId = currentChildId;
    if (!currentUserId) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('last_custom_lessons_visit')
      .eq('id', currentUserId)
      .maybeSingle();

    const lastVisit = profileData?.last_custom_lessons_visit;

    const { data: lessons } = await supabase
      .from('custom_lessons')
      .select('id, created_at')
      .eq('child_id', currentUserId);

    if (lessons) {
      if (lastVisit) {
        const newLessons = lessons.filter(l => new Date(l.created_at) > new Date(lastVisit));
        setNewCustomLessonsCount(newLessons.length);
      } else {
        setNewCustomLessonsCount(lessons.length);
      }
    }
  }

  async function loadUnreadFriendRequests() {
    const currentUserId = currentChildId;
    if (!currentUserId) return;

    const { data: friendRequestNotifs } = await supabase
      .from('friend_request_notifications')
      .select('id')
      .eq('recipient_child_id', currentUserId)
      .eq('is_read', false);

    setUnreadFriendRequests(friendRequestNotifs?.length || 0);
  }

  async function loadDrawingStats() {
    if (!currentChildId) {
      setDrawingStats({ total: 0, shared: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('drawings')
      .select('id, is_shared')
      .eq('child_id', currentChildId);

    if (error) {
      console.error('Error loading drawing stats:', error);
      return;
    }

    const total = data?.length || 0;
    const shared = (data || []).filter(d => d.is_shared).length;
    setDrawingStats({ total, shared });
  }

  async function loadChildren() {
    if (!user) return;
    setLoadingChildren(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', user.id);

    if (error) {
      console.error('Error loading children:', error);
    } else {
      setChildren(data || []);
    }
    setLoadingChildren(false);
  }

  async function loadChildPoints(childId: string) {
    const { data, error } = await supabase
      .from('progress')
      .select('score')
      .eq('child_id', childId)
      .eq('completed', true);

    if (error) {
      console.error('Error loading child points:', error);
      return;
    }

    const total = data?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    setChildPoints(total);
  }

  useEffect(() => {
    if (selectedChild) {
      loadChildPoints(selectedChild.id);
    }
  }, [selectedChild]);

  async function handleAddChild() {
    if (!user || !newChildData.full_name || !newChildData.age || !newChildData.grade_level) return;

    setAddingChild(true);
    const { error } = await supabase
      .from('profiles')
      .insert({
        full_name: newChildData.full_name,
        age: parseInt(newChildData.age),
        grade_level: newChildData.grade_level,
        parent_id: user.id,
        role: 'child',
        email: null
      });

    if (error) {
      console.error('Error adding child:', error);
      alert('Erreur lors de l\'ajout de l\'enfant: ' + error.message);
    } else {
      setNewChildData({ full_name: '', age: '', grade_level: '' });
      setShowAddChild(false);
      loadChildren();
    }
    setAddingChild(false);
  }

  async function loadSubjects() {
    const currentGradeLevel = adminViewLevel || selectedChild?.grade_level || profile?.grade_level;

    if (!currentGradeLevel) {
      setSubjects([]);
      return;
    }

    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('subject_id')
      .eq('grade_level', currentGradeLevel);

    if (!chaptersData || chaptersData.length === 0) {
      setSubjects([]);
      return;
    }

    const subjectIds = [...new Set(chaptersData.map(c => c.subject_id))];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .in('id', subjectIds)
      .order('name');

    if (error) {
      console.error('Error loading subjects:', error);
      return;
    }

    const filteredSubjects = (data || []).filter(subject => {
      const normalizedName = subject.name.trim().toLowerCase();
      return normalizedName !== 'jeux en ligne' && normalizedName !== 'online games';
    });

    setSubjects(filteredSubjects);
  }

  const handleProfilePanelClick = () => {
    if (profile?.id) {
      onProfileClick?.(profile.id);
    }
  };

  const handleCoursesPanelClick = () => {
    onCoursesClick();
  };

  const handleBattlePanelClick = async () => {
    const currentUserId = currentChildId;
    if (currentUserId) {
      const timestamp = new Date().toISOString();
      console.log('⚔️ Updating last_battle_hub_visit for user:', currentUserId, 'to:', timestamp);
      const { error } = await supabase
        .from('profiles')
        .update({ last_battle_hub_visit: timestamp })
        .eq('id', currentUserId);

      if (error) {
        console.error('❌ Error updating last_battle_hub_visit:', error);
      } else {
        console.log('✅ Successfully updated last_battle_hub_visit');
      }
    }

    setUnreadBattleNotifications(0);
    onBattleClick?.();
  };

  const handleStoriesPanelClick = async () => {
    const currentUserId = currentChildId;
    if (currentUserId) {
      const timestamp = new Date().toISOString();
      console.log('📖 Updating last_stories_visit for user:', currentUserId, 'to:', timestamp);
      const { error } = await supabase
        .from('profiles')
        .update({ last_stories_visit: timestamp })
        .eq('id', currentUserId);

      if (error) {
        console.error('❌ Error updating last_stories_visit:', error);
      } else {
        console.log('✅ Successfully updated last_stories_visit');
      }
    }

    setUnreadStoriesCount(0);
    setShowStories(true);
    onStoriesClick?.();
  };

  const handleCustomLessonsPanelClick = async () => {
    const currentUserId = currentChildId;
    if (currentUserId) {
      const timestamp = new Date().toISOString();
      console.log('📚 Updating last_custom_lessons_visit for user:', currentUserId, 'to:', timestamp);
      const { error } = await supabase
        .from('profiles')
        .update({ last_custom_lessons_visit: timestamp })
        .eq('id', currentUserId);

      if (error) {
        console.error('❌ Error updating last_custom_lessons_visit:', error);
      } else {
        console.log('✅ Successfully updated last_custom_lessons_visit');
      }
    }

    setNewCustomLessonsCount(0);
    setShowCustomLessons(true);
  };

  const handleDrawingPanelClick = () => {
    if (!currentChildId) return;
    setShowDrawingStudio(true);
  };

  const subjectsCountLabel = `${subjects.length} matière${subjects.length > 1 ? 's' : ''} disponibles`;
  const battleWinsLabel = `${battleWins} victoire${battleWins > 1 ? 's' : ''}`;
  const battleChallengesLabel =
    unreadBattleNotifications > 0
      ? `${unreadBattleNotifications} nouveau${unreadBattleNotifications > 1 ? 'x' : ''} défi${unreadBattleNotifications > 1 ? 's' : ''}`
      : 'Pas de nouveaux défis';
  const storiesUpdateLabel =
    unreadStoriesCount > 0
      ? `${unreadStoriesCount} nouvelle${unreadStoriesCount > 1 ? 's' : ''} histoire${unreadStoriesCount > 1 ? 's' : ''}`
      : 'Aucune nouvelle histoire';
  const customLessonsLabel =
    newCustomLessonsCount > 0
      ? `${newCustomLessonsCount} leçon${newCustomLessonsCount > 1 ? 's' : ''} sur mesure à explorer`
      : 'À jour pour le moment';
  const drawingsTotalLabel = `${drawingStats.total} dessin${drawingStats.total > 1 ? 's' : ''}`;
  const drawingsSharedLabel = `${drawingStats.shared} partagé${drawingStats.shared > 1 ? 's' : ''}`;

  if (profile?.role === 'parent' && !selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Sélectionnez un enfant
              </h2>
              <p className="text-gray-600">
                Choisissez l'enfant qui va commencer son apprentissage
              </p>
            </div>

            {loadingChildren ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : children.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="text-4xl md:text-6xl mb-4">👶</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">Aucun enfant enregistré</h3>
                <p className="text-gray-600 mb-6">
                  Veuillez ajouter un enfant pour commencer l'apprentissage.
                </p>
                <p className="text-sm text-gray-500">
                  Contactez l'administrateur pour ajouter des profils enfants.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    className="w-full bg-white hover:bg-gray-50 rounded-2xl shadow-lg p-6 transition text-left flex items-center gap-4 group"
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition">
                      {child.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">
                        {child.full_name}
                      </h3>
                      <p className="text-gray-600">{child.age} ans{child.grade_level ? ` • ${child.grade_level}` : ''}</p>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-2 transition">
                      →
                    </div>
                  </button>
                ))}

                {!showAddChild ? (
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="w-full bg-white hover:bg-gray-50 rounded-xl shadow-md p-4 transition text-gray-700 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-green-400"
                  >
                    <Plus size={20} />
                    <span className="font-semibold">Ajouter un enfant</span>
                  </button>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Nouvel enfant</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nom complet</label>
                        <input
                          type="text"
                          value={newChildData.full_name}
                          onChange={(e) => setNewChildData({ ...newChildData, full_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: Marie Dupont"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Âge</label>
                        <input
                          type="number"
                          value={newChildData.age}
                          onChange={(e) => setNewChildData({ ...newChildData, age: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: 8"
                          min="5"
                          max="18"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau scolaire</label>
                        <select
                          value={newChildData.grade_level}
                          onChange={(e) => setNewChildData({ ...newChildData, grade_level: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionnez un niveau</option>
                          <option value="CP">CP</option>
                          <option value="CE1">CE1</option>
                          <option value="CE2">CE2</option>
                          <option value="CM1">CM1</option>
                          <option value="CM2">CM2</option>
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleAddChild}
                          disabled={!newChildData.full_name || !newChildData.age || !newChildData.grade_level || addingChild}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
                        >
                          {addingChild ? 'Ajout...' : 'Ajouter'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddChild(false);
                            setNewChildData({ full_name: '', age: '', grade_level: '' });
                          }}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showCustomLessons) {
    return <CustomLessonsChild childId={currentChildId ?? undefined} onClose={() => setShowCustomLessons(false)} />;
  }

  if (showStories) {
    return <StoriesLibrary childId={currentChildId ?? undefined} onClose={() => setShowStories(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="hidden md:block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-4 px-4 shadow-lg mb-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            {profile && (
              <>
                <AvatarDisplay
                  userId={profile.id}
                  fallbackName={profile.full_name}
                  size="lg"
                  onAvatarClick={() => onProfileClick?.(profile.id)}
                  onEditClick={onAvatarClick}
                />
                <div
                  onClick={() => onProfileClick?.(profile.id)}
                  className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition"
                >
                  <h2 className="text-xl md:text-2xl font-bold text-white truncate">{profile.full_name}</h2>
                  <p className="text-sm text-white/80">{profile.grade_level}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400/30 to-yellow-500/30 backdrop-blur-sm px-4 py-2.5 rounded-full border border-yellow-300/40">
                    <Trophy size={24} className="text-yellow-300" />
                    <span className="font-bold text-white text-base">{totalPoints} pts</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-red-400/30 to-orange-400/30 backdrop-blur-sm px-4 py-2.5 rounded-full border border-red-300/40">
                    <Swords size={24} className="text-red-300" />
                    <span className="font-bold text-white text-base">{battleWins}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {profile?.role === 'parent' && selectedChild && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <AvatarDisplay userId={selectedChild.id} fallbackName={selectedChild.full_name} size="md" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedChild.full_name}</h2>
                  {selectedChild.grade_level && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <BookOpen size={18} />
                      <span className="font-semibold">{selectedChild.grade_level}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 rounded-xl shadow-md">
                  <Trophy size={24} className="text-yellow-900" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-900 uppercase">Score</p>
                    <p className="text-2xl font-black text-yellow-900">{childPoints}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedChild(null)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                ← Changer d'enfant
              </button>
            </div>
          </div>
        )}

        {profile?.role === 'admin' && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border-2 border-orange-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="text-orange-500" />
                Simuler la vue d'un niveau
              </h3>
              <p className="text-gray-600 mb-4">
                Sélectionnez un niveau pour voir les matières comme un élève de ce niveau les verrait.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAdminViewLevel(null)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    !adminViewLevel
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-orange-100'
                  }`}
                >
                  Toutes les matières
                </button>
                {GRADE_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setAdminViewLevel(level)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      adminViewLevel === level
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {birthdayCompletion.shouldPrompt && (
          <div className="max-w-3xl mx-auto mb-6">
            <BirthdayNotificationCard onAction={birthdayCompletion.openModal} />
          </div>
        )}

        {profile?.role !== 'child' && !selectedChild && profile?.role !== 'admin' && (
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Logo size={80} />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-800 mb-4">
              Bienvenue sur PioPi !
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Choisis une aventure pour commencer à apprendre !
            </p>
          </div>
        )}

        {(profile?.role === 'child' || (profile?.role === 'parent' && selectedChild)) && (
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 mb-12">
              <FeaturePanel
                title="Mon profil"
                description="Gère ton avatar, ton statut et tes informations personnelles."
                icon={<User className="h-6 w-6" />}
                accentGradient="from-slate-600 via-slate-500 to-slate-400"
                onClick={handleProfilePanelClick}
                badge={unreadFriendRequests > 0 ? <NotificationBadge count={unreadFriendRequests} /> : undefined}
                stats={
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold">{totalPoints} points gagnés</span>
                  </div>
                }
                cta="Personnaliser mon profil"
              />

              <FeaturePanel
                title="Mes cours"
                description="Accède à toutes tes matières et continue ta progression."
                icon={<BookOpen className="h-6 w-6" />}
                accentGradient="from-emerald-500 via-teal-400 to-cyan-400"
                onClick={handleCoursesPanelClick}
                stats={
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold">{subjectsCountLabel}</span>
                  </div>
                }
                cta="Reprendre mes cours"
              />

              <FeaturePanel
                title="Battle Hub"
                description="Défie tes amis dans des duels de quiz en ligne."
                icon={<Sword className="h-6 w-6" />}
                accentGradient="from-rose-500 via-orange-400 to-amber-400"
                onClick={handleBattlePanelClick}
                badge={unreadBattleNotifications > 0 ? <NotificationBadge count={unreadBattleNotifications} /> : undefined}
                stats={
                  <>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold">{battleWinsLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Swords className="h-4 w-4 text-rose-500" />
                      <span>{battleChallengesLabel}</span>
                    </div>
                  </>
                }
                cta="Lancer le Battle Hub"
              />

              <FeaturePanel
                title="Ma bibliothèque d'histoires"
                description="Crée, lis et partage tes histoires personnalisées."
                icon={<Book className="h-6 w-6" />}
                accentGradient="from-amber-500 via-orange-400 to-yellow-400"
                onClick={handleStoriesPanelClick}
                badge={unreadStoriesCount > 0 ? <NotificationBadge count={unreadStoriesCount} gradient="from-amber-500 via-orange-400 to-yellow-400" /> : undefined}
                stats={
                  <>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Un nouvel univers de lecture t'attend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold">{storiesUpdateLabel}</span>
                    </div>
                  </>
                }
                cta="Explorer ma bibliothèque"
                className="md:col-span-2 lg:col-span-2"
              />

              <FeaturePanel
                title="Atelier créatif"
                description="Imagine, dessine et partage tes chefs-d'œuvre avec tes amis."
                icon={<Palette className="h-6 w-6" />}
                accentGradient="from-fuchsia-500 via-pink-500 to-rose-500"
                onClick={handleDrawingPanelClick}
                disabled={!currentChildId}
                stats={
                  <>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-pink-500" />
                      <span className="font-semibold">{drawingsTotalLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-rose-500" />
                      <span>{drawingsSharedLabel}</span>
                    </div>
                  </>
                }
                cta="Ouvrir l'atelier créatif"
                className="md:col-span-2 lg:col-span-2"
              />

              <FeaturePanel
                title="Coach Devoirs PioPi"
                description="Ton assistant intelligent disponible à tout moment pour t'aider."
                icon={<Bot className="h-6 w-6" />}
                accentGradient="from-purple-500 via-violet-500 to-indigo-500"
                onClick={onCoachClick}
                stats={
                  <>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>Des réponses instantanées à tes questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold">Besoin d'aide ? Clique ici</span>
                    </div>
                  </>
                }
                cta="Parler au coach PioPi"
              />

              <FeaturePanel
                title="Cours personnalisés"
                description="Découvre les leçons uniques créées spécialement pour toi."
                icon={<BookPlus className="h-6 w-6" />}
                accentGradient="from-indigo-500 via-purple-500 to-pink-500"
                onClick={handleCustomLessonsPanelClick}
                badge={newCustomLessonsCount > 0 ? <NotificationBadge count={newCustomLessonsCount} gradient="from-indigo-500 via-purple-500 to-pink-500" /> : undefined}
                stats={
                  <div className="flex items-center gap-2">
                    <BookPlus className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold">{customLessonsLabel}</span>
                  </div>
                }
                cta="Découvrir mes leçons sur mesure"
              />
            </div>
          </div>
        )}

        {!profile && (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-lg">👆 Connecte-toi pour commencer ton aventure !</p>
          </div>
        )}

      </div>

      <ChildBirthdayModal
        isOpen={birthdayCompletion.isModalOpen}
        onClose={birthdayCompletion.closeModal}
        onSubmit={birthdayCompletion.submitBirthday}
        loading={birthdayCompletion.loading}
        error={birthdayCompletion.error}
        successMessage={birthdayCompletion.successMessage}
        onResetFeedback={birthdayCompletion.resetFeedback}
        defaultBirthday={profile?.birthday ?? null}
      />

    </div>
  );
}
