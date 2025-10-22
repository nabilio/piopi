import { useEffect, useState } from 'react';
import { Rocket, Star, BookOpen, Trophy, UserPlus, Plus, ArrowLeft, Sword, Swords, User, Book, Sparkles, Bot, BookPlus } from 'lucide-react';
import { supabase, Subject, Profile } from '../lib/supabase';
import { SubjectCard } from './SubjectCard';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { AvatarDisplay } from './AvatarDisplay';
import { BattleSetup } from './BattleSetup';
import { BattleHub } from './BattleHub';
import { Logo } from './Logo';
import { StoriesLibrary } from './StoriesLibrary';
import { CustomLessonsChild } from './CustomLessonsChild';

type HomePageProps = {
  onSubjectSelect: (subject: Subject) => void;
  onCoachClick: () => void;
  onProfileClick?: (profileId: string) => void;
  onAvatarClick?: () => void;
  onBattleClick?: () => void;
  onCoursesClick?: () => void;
  onBattleCreated?: (battleId: string) => void;
  onStoriesClick?: () => void;
};

export function HomePage({ onSubjectSelect, onCoachClick, onProfileClick, onAvatarClick, onBattleClick, onCoursesClick = () => {}, onBattleCreated, onStoriesClick = () => {} }: HomePageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { profile, user } = useAuth();
  const { totalPoints } = useGamification();
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

    const currentUserId = selectedChild?.id || profile?.id;
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

  async function loadBattleStats() {
    if (!profile?.id) return;

    const currentUserId = selectedChild?.id || profile.id;

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
    if (!profile?.id) return;

    const currentUserId = selectedChild?.id || profile.id;
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
    if (!profile?.id) return;
    const currentUserId = selectedChild?.id || profile.id;

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
    if (!profile?.id) return;
    const currentUserId = selectedChild?.id || profile.id;

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
    if (!profile?.id) return;
    const currentUserId = selectedChild?.id || profile.id;

    const { data: friendRequestNotifs } = await supabase
      .from('friend_request_notifications')
      .select('id')
      .eq('recipient_child_id', currentUserId)
      .eq('is_read', false);

    setUnreadFriendRequests(friendRequestNotifs?.length || 0);
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
    return <CustomLessonsChild childId={profile?.id} onClose={() => setShowCustomLessons(false)} />;
  }

  if (showStories) {
    return <StoriesLibrary childId={selectedChild?.id} onClose={() => setShowStories(false)} />;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
            <div className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={() => onProfileClick?.(profile?.id || '')}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              {unreadFriendRequests > 0 && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-lg animate-pulse" />
                    <div className="relative bg-red-500 text-white font-black text-base md:text-lg rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-2xl border-3 md:border-4 border-white">
                      {unreadFriendRequests}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                  <div className="relative bg-white/30 backdrop-blur-sm p-2.5 md:p-3 rounded-2xl">
                    <User size={36} className="text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">Mon Profil</h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Gère ton avatar et tes informations
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Trophy size={18} />
                  <span className="font-semibold">{totalPoints} points</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={onCoursesClick}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                  <div className="relative bg-white/30 backdrop-blur-sm p-2.5 md:p-3 rounded-2xl">
                    <BookOpen size={36} className="text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">Mes Cours</h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Accède à toutes tes matières et leçons
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <BookOpen size={18} />
                  <span className="font-semibold">{subjects.length} matières disponibles</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={async () => {
              const currentUserId = selectedChild?.id || profile?.id;
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
            }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              {unreadBattleNotifications > 0 && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-lg animate-pulse" />
                    <div className="relative bg-red-500 text-white font-black text-base md:text-lg rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-2xl border-3 md:border-4 border-white">
                      {unreadBattleNotifications}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Sword size={28} className="md:hidden text-white" />
                    <Sword size={32} className="hidden md:block text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">
                  Mode Battle<br />
                  <span className="text-base md:text-lg">En ligne</span>
                </h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Défie tes amis dans des duels de quiz
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Trophy size={18} />
                  <span className="font-semibold">Deviens le champion!</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={async () => {
              const currentUserId = selectedChild?.id || profile?.id;
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
            }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              {unreadStoriesCount > 0 && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-lg animate-pulse" />
                    <div className="relative bg-red-500 text-white font-black text-base md:text-lg rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-2xl border-3 md:border-4 border-white">
                      {unreadStoriesCount}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Book size={28} className="md:hidden text-white" />
                    <Book size={32} className="hidden md:block text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">Mes Histoires</h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Crée et lis tes aventures personnalisées
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Sparkles size={18} />
                  <span className="font-semibold">3 histoires par jour</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={onCoachClick}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Bot size={28} className="md:hidden text-white" />
                    <Bot size={32} className="hidden md:block text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">Coach Devoirs PioPi</h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Ton assistant intelligent disponible 24/7
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <BookOpen size={18} />
                  <span className="font-semibold">Besoin d'aide?</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-3xl transition-all hover:-translate-y-1" onClick={async () => {
              const currentUserId = selectedChild?.id || profile?.id;
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
            }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              {newCustomLessonsCount > 0 && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-lg animate-pulse" />
                    <div className="relative bg-red-500 text-white font-black text-base md:text-lg rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-2xl border-3 md:border-4 border-white">
                      {newCustomLessonsCount}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <BookPlus size={28} className="md:hidden text-white" />
                    <BookPlus size={32} className="hidden md:block text-white" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black mb-2">Cours Personnalisés</h2>
                <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
                  Apprends avec des leçons créées par tes parents
                </p>

                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <BookPlus size={18} />
                  <span className="font-semibold">Leçons sur mesure</span>
                </div>
              </div>
            </div>
            </div>

          </div>
        )}

        {!profile && (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-lg">👆 Connecte-toi pour commencer ton aventure !</p>
          </div>
        )}

      </div>

    </div>
  );
}
