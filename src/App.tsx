import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AvatarRefreshProvider } from './contexts/AvatarRefreshContext';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { SubjectView } from './components/SubjectView';
import { CoachDevoirs } from './components/CoachDevoirs';
import { ParentDashboard } from './components/ParentDashboard';
import { AuthModal } from './components/AuthModal';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { AchievementNotification } from './components/AchievementNotification';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Onboarding } from './components/Onboarding';
import { ParentOnboarding } from './components/ParentOnboarding';
import { QuizPlayer } from './components/QuizPlayer';
import { AdminPanel } from './components/AdminPanel';
import { SocialFeed } from './components/SocialFeed';
import { NetworkPanel } from './components/NetworkPanel';
import { Settings } from './components/Settings';
import { UserExplorer } from './components/UserExplorer';
import { LandingPage } from './components/LandingPage';
import { SimpleRegistration } from './components/SimpleRegistration';
import { ParentHome } from './components/ParentHome';
import { ParentActivityFeed } from './components/ParentActivityFeed';
import { ParentNotifications } from './components/ParentNotifications';
import { ChildNotifications } from './components/ChildNotifications';
import { LessonContent } from './components/LessonContent';
import { SubjectIntro } from './components/SubjectIntro';
import { UserProfilePage } from './components/UserProfilePage';
import { ChildProfile } from './components/ChildProfile';
import { StatusSelector } from './components/StatusSelector';
import { Footer } from './components/Footer';
import { ContactPage } from './components/ContactPage';
import { TermsPage } from './components/TermsPage';
import { PrivacyPage } from './components/PrivacyPage';
import { LegalNoticePage } from './components/LegalNoticePage';
import { BattleWaitingRoom } from './components/BattleWaitingRoom';
import { BattleArena } from './components/BattleArena';
import { BattleResults } from './components/BattleResults';
import { BattleHub } from './components/BattleHub';
import { CoursesView } from './components/CoursesView';
import { EmailConfirmed } from './components/EmailConfirmed';
import { EmailConfirmedPage } from './components/EmailConfirmedPage';
import { AddChildWithUpgrade } from './components/AddChildWithUpgrade';
import { UpgradePlansPage } from './components/UpgradePlansPage';
import { CookieConsent } from './components/CookieConsent';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { TestQuizQuery } from './components/TestQuizQuery';
import { StoriesLibrary } from './components/StoriesLibrary';
import { useGamification } from './hooks/useGamification';
import { Subject, Activity } from './lib/supabase';
import { supabase } from './lib/supabase';

type View = 'home' | 'parent-home' | 'courses' | 'subject-intro' | 'subject' | 'lesson' | 'coach' | 'parent-dashboard' | 'activity' | 'quiz' | 'admin' | 'social' | 'friends' | 'public-feed' | 'settings' | 'network' | 'contact' | 'terms' | 'privacy' | 'legal' | 'child-activity' | 'notifications' | 'child-profile' | 'user-profile' | 'battle-hub' | 'battle-waiting' | 'battle-arena' | 'battle-results' | 'add-child-upgrade' | 'upgrade-plan' | 'stories';

function UpgradePlanView({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChildrenCount() {
      if (!user) return;

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('role', 'child');

      setChildrenCount(count || 0);
      setLoading(false);
    }

    loadChildrenCount();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition mb-6"
        >
          <ArrowLeft size={24} />
          <span className="font-semibold">Retour aux paramètres</span>
        </button>
        <UpgradePlansPage
          currentChildrenCount={childrenCount}
          onCancel={onBack}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

function AppContent() {
  const { profile, loading, refreshProfile, user, switchToChildProfile, isViewingAsChild, signOut } = useAuth();
  const { totalPoints, newAchievement, clearNewAchievement, refreshGamificationData } = useGamification();
  const [view, setView] = useState<View>('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [chaptersCount, setChaptersCount] = useState(0);
  const [activitiesCount, setActivitiesCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [showQuizExitConfirm, setShowQuizExitConfirm] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [timerPreference, setTimerPreference] = useState<boolean | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [subscriptionRefreshTrigger, setSubscriptionRefreshTrigger] = useState(0);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [showEmailConfirmed, setShowEmailConfirmed] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'security' | 'notifications' | 'subscription' | 'children'>('profile');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('emailConfirmed') === 'true') {
      setShowEmailConfirmed(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    const wantsReactivate = urlParams.get('reactivate') === 'true';
    const wantsSubscriptionSettings = urlParams.get('settings') === 'subscription';

    if (wantsReactivate || wantsSubscriptionSettings) {
      if (user && profile?.role === 'parent') {
        setSettingsInitialTab('subscription');
        setView(wantsReactivate ? 'upgrade-plan' : 'settings');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        if (wantsReactivate) {
          localStorage.setItem('pendingReactivate', 'true');
        }
        if (wantsSubscriptionSettings) {
          localStorage.setItem('pendingSubscriptionSettings', 'true');
        }
      }
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile?.role === 'parent') {
      const pendingReactivate = localStorage.getItem('pendingReactivate');
      const pendingSubscriptionSettings = localStorage.getItem('pendingSubscriptionSettings');

      if (pendingReactivate === 'true') {
        localStorage.removeItem('pendingReactivate');
        setSettingsInitialTab('subscription');
        setView('upgrade-plan');
      } else if (pendingSubscriptionSettings === 'true') {
        localStorage.removeItem('pendingSubscriptionSettings');
        setSettingsInitialTab('subscription');
        setView('settings');
      }
    }
  }, [user, profile]);

  // Vérifier si on est sur la page de confirmation d'email
  if (window.location.pathname === '/confirm-email') {
    return <EmailConfirmedPage />;
  }

  // Vérifier si on est sur la page de réinitialisation de mot de passe
  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  // DEBUG: Show test query page
  if (window.location.search.includes('test-quiz-query')) {
    return <TestQuizQuery />;
  }


  useEffect(() => {
    if (!user) {
      setView('home');
      setSelectedSubject(null);
      setSelectedActivity(null);
      setShowAvatarCustomizer(false);
      setShowOnboarding(false);
    } else if (profile?.role === 'admin' && profile?.onboarding_completed) {
      if (view === 'home') {
        setView('admin');
      }
    } else if (profile?.role === 'parent' && !isViewingAsChild && profile?.onboarding_completed) {
      if (view === 'home') {
        setView('parent-home');
      }
    } else if ((profile?.role === 'child' || isViewingAsChild) && (view === 'parent-dashboard' || view === 'parent-home')) {
      setView('home');
    }
  }, [user, profile, isViewingAsChild]);

  if (showEmailConfirmed) {
    return <EmailConfirmed />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (view === 'contact') {
      return <ContactPage onBack={() => setView('home')} />;
    }
    if (view === 'terms') {
      return <TermsPage onBack={() => setView('home')} />;
    }
    if (view === 'privacy') {
      return <PrivacyPage onBack={() => setView('home')} />;
    }
    if (view === 'legal') {
      return <LegalNoticePage onBack={() => setView('home')} />;
    }

    if (showRegistration) {
      return (
        <SimpleRegistration
          onSuccess={() => {
            refreshProfile();
          }}
          onBackToLogin={() => setShowRegistration(false)}
          onContactClick={() => setView('contact')}
          onTermsClick={() => setView('terms')}
          onPrivacyClick={() => setView('privacy')}
          onLegalClick={() => setView('legal')}
        />
      );
    }

    return (
      <>
        <LandingPage
          onRegisterClick={() => setShowRegistration(true)}
          onContactClick={() => setView('contact')}
          onTermsClick={() => setView('terms')}
          onPrivacyClick={() => setView('privacy')}
          onLegalClick={() => setView('legal')}
        />
      </>
    );
  }


  if (profile && !profile.onboarding_completed) {
    if (profile.role === 'parent') {
      return <ParentOnboarding onComplete={refreshProfile} />;
    }
    return <Onboarding onComplete={refreshProfile} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => {
      setShowOnboarding(false);
      refreshProfile();
      setView('parent-dashboard');
    }} />;
  }

  function handleNavigationAttempt(newView: View) {
    if (isQuizActive && view === 'activity') {
      setPendingView(newView);
      setShowQuizExitConfirm(true);
    } else {
      setView(newView);
    }
  }

  function confirmQuizExit() {
    setIsQuizActive(false);
    setShowQuizExitConfirm(false);
    setSelectedActivity(null);
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    }
  }

  function cancelQuizExit() {
    setShowQuizExitConfirm(false);
    setPendingView(null);
  }

  async function handleSubjectSelect(subject: Subject) {
    setSelectedSubject(subject);

    const userGradeLevel = profile?.grade_level;
    let chaptersQuery = supabase
      .from('chapters')
      .select('id')
      .eq('subject_id', subject.id);

    if (userGradeLevel) {
      chaptersQuery = chaptersQuery.eq('grade_level', userGradeLevel);
    }

    const { data: chapters } = await chaptersQuery;
    setChaptersCount(chapters?.length || 0);

    let activitiesQuery = supabase
      .from('activities')
      .select('id')
      .eq('subject_id', subject.id);

    if (userGradeLevel) {
      activitiesQuery = activitiesQuery.eq('grade_level', userGradeLevel);
    }

    const { data: activities } = await activitiesQuery;
    setActivitiesCount(activities?.length || 0);

    setView('subject-intro');
  }

  function handleBack() {
    if (view === 'subject-intro') {
      if (profile?.role === 'parent') {
        setView('parent-home');
      } else {
        setView('home');
      }
      setSelectedSubject(null);
    } else if (view === 'subject') {
      setView('subject-intro');
    } else if (view === 'lesson') {
      setView('subject');
    } else if (view === 'coach') {
      setView('home');
    } else if (view === 'parent-dashboard') {
      setView('parent-home');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <Header
        onAuthClick={() => setShowAuthModal(true)}
        onActivityFeedClick={() => handleNavigationAttempt('friends')}
        onParentDashboardClick={() => {
          if (profile?.role === 'parent') {
            handleNavigationAttempt('parent-dashboard');
          }
        }}
        onPublicFeedClick={() => handleNavigationAttempt('public-feed')}
        onSettingsClick={() => handleNavigationAttempt('settings')}
        onNetworkClick={() => handleNavigationAttempt('network')}
        onNotificationsClick={() => handleNavigationAttempt('notifications')}
        onBattleInvitationClick={(battleId) => {
          setActiveBattleId(battleId);
          setView('battle-waiting');
        }}
        onHomeClick={() => {
          if (profile?.role === 'parent') {
            handleNavigationAttempt('parent-home');
          } else {
            handleNavigationAttempt('home');
          }
        }}
        onAdminClick={profile?.role === 'admin' ? () => handleNavigationAttempt('admin') : undefined}
        onAvatarClick={() => setShowAvatarCustomizer(true)}
        onProfileClick={() => {
          if (profile?.id) {
            setViewingProfileId(profile.id);
            setView('child-profile');
          }
        }}
        onExitChildProfile={async () => {
          await signOut();
          setView('home');
          setSelectedSubject(null);
          setSelectedActivity(null);
          setSelectedChapter(null);
          setIsQuizActive(false);
        }}
      />


      {view === 'parent-home' && profile?.role === 'parent' && (
        <ParentHome
          onChildSelect={async (childId) => {
            await switchToChildProfile(childId);
            setView('home');
          }}
          onNavigate={(view) => handleNavigationAttempt(view as any)}
        />
      )}

      {view === 'home' && (profile?.role === 'child' || isViewingAsChild) && (
        <HomePage
          onSubjectSelect={handleSubjectSelect}
          onCoachClick={() => setView('coach')}
          onProfileClick={(profileId) => {
            setViewingProfileId(profileId);
            setView('child-profile');
          }}
          onAvatarClick={() => setShowAvatarCustomizer(true)}
          onBattleClick={() => setView('battle-hub')}
          onCoursesClick={() => setView('courses')}
          onBattleCreated={(battleId) => {
            setActiveBattleId(battleId);
            setView('battle-waiting');
          }}
        />
      )}

      {view === 'courses' && (
        <CoursesView
          onBack={() => {
            if (profile?.role === 'parent') {
              handleNavigationAttempt('parent-home');
            } else {
              handleNavigationAttempt('home');
            }
          }}
          onSubjectSelect={handleSubjectSelect}
        />
      )}

      {view === 'subject-intro' && selectedSubject && (
        <SubjectIntro
          subject={selectedSubject}
          onBack={handleBack}
          onViewLessons={() => setView('subject')}
          chaptersCount={chaptersCount}
          activitiesCount={activitiesCount}
        />
      )}

      {view === 'subject' && selectedSubject && (
        <SubjectView
          subject={selectedSubject}
          onBack={handleBack}
          onLessonView={(chapter) => {
            setSelectedChapter(chapter);
            setView('lesson');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {view === 'lesson' && selectedChapter && selectedSubject && (
        <LessonContent
          chapter={selectedChapter}
          subjectName={selectedSubject.name}
          onStartQuiz={(activity) => {
            setSelectedActivity(activity);
            setView('activity');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={() => {
            setTimerPreference(null);
            handleBack();
          }}
        />
      )}

      {view === 'activity' && selectedActivity && (
        selectedActivity.type === 'quiz' ? (
          <QuizPlayer
            activity={selectedActivity}
            subjectName={selectedSubject?.name}
            lessonName={selectedChapter?.title}
            onComplete={() => {
              setIsQuizActive(false);
              setSelectedActivity(null);
              setView('lesson');
              refreshProfile();
              refreshGamificationData();
            }}
            onBack={() => {
              setIsQuizActive(false);
              setView('lesson');
              setSelectedActivity(null);
              setTimerPreference(null);
            }}
            onQuizStart={() => setIsQuizActive(true)}
            timerPreference={timerPreference}
            onTimerPreferenceSet={setTimerPreference}
            onContinueNext={async () => {
              // Load next quiz in the same chapter
              if (!selectedChapter) return;

              const { data: activities } = await supabase
                .from('activities')
                .select('*')
                .eq('chapter_id', selectedChapter.id)
                .eq('type', 'quiz')
                .order('order_index', { ascending: true });

              if (activities && activities.length > 0) {
                const currentIndex = activities.findIndex(a => a.id === selectedActivity.id);
                const nextQuiz = activities[currentIndex + 1];

                if (nextQuiz) {
                  // Keep quiz active and just change activity - useEffect in QuizPlayer will handle reset
                  setSelectedActivity(nextQuiz);
                  // Keep timerPreference as is - don't reset it
                } else {
                  // No more quizzes, go back to lesson
                  setIsQuizActive(false);
                  setView('lesson');
                  setSelectedActivity(null);
                }
              }
            }}
          />
        ) : (
          <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{selectedActivity.title}</h2>
              <p className="text-gray-600 mb-6">
                Interface de jeu en cours de développement...
              </p>
              <div className="bg-blue-50 p-6 rounded-xl mb-6">
                <p className="text-sm text-gray-700 mb-2"><strong>Type:</strong> {selectedActivity.type}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>Difficulté:</strong> {selectedActivity.difficulty}/5</p>
                <p className="text-sm text-gray-700"><strong>Points:</strong> {selectedActivity.points}</p>
              </div>
              <button
                onClick={() => {
                  setView('lesson');
                  setSelectedActivity(null);
                }}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-8 py-3 rounded-full hover:from-blue-600 hover:to-cyan-600 transition"
              >
                Retour à la leçon
              </button>
            </div>
          </div>
        )
      )}

      {view === 'coach' && <CoachDevoirs onBack={handleBack} />}

      {view === 'parent-dashboard' && (
        <ParentDashboard
          onBack={handleBack}
          onAddChild={() => setShowOnboarding(true)}
          onViewActivity={(childId) => {
            setSelectedChildId(childId);
            setView('child-activity');
          }}
          onNavigate={(view) => handleNavigationAttempt(view as any)}
        />
      )}

      {view === 'child-activity' && selectedChildId && (
        <ParentActivityFeed
          childId={selectedChildId}
          onBack={() => {
            setSelectedChildId(null);
            setView('parent-dashboard');
          }}
        />
      )}

      {view === 'settings' && (
        <Settings
          onBack={() => {
            setSettingsInitialTab('profile');
            if (profile?.role === 'parent') {
              handleNavigationAttempt('parent-home');
            } else {
              handleNavigationAttempt('home');
            }
          }}
          onUpgradePlan={() => handleNavigationAttempt('upgrade-plan')}
          refreshTrigger={subscriptionRefreshTrigger}
          initialTab={settingsInitialTab}
        />
      )}

      {view === 'add-child-upgrade' && (
        <AddChildWithUpgrade
          onBack={() => handleNavigationAttempt('parent-home')}
          onSuccess={() => {
            refreshProfile();
            handleNavigationAttempt('parent-home');
          }}
        />
      )}

      {view === 'upgrade-plan' && (
        <UpgradePlanView
          onBack={() => handleNavigationAttempt('settings')}
          onSuccess={() => {
            refreshProfile();
            setSubscriptionRefreshTrigger(prev => prev + 1);
            handleNavigationAttempt('settings');
          }}
        />
      )}

      {view === 'stories' && selectedChildId && (
        <StoriesLibrary
          childId={selectedChildId}
          onClose={() => {
            setSelectedChildId(null);
            handleNavigationAttempt('parent-home');
          }}
        />
      )}

      {view === 'network' && (
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => {
              if (profile?.role === 'parent') {
                handleNavigationAttempt('parent-home');
              } else {
                handleNavigationAttempt('home');
              }
            }}
            className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
          >
            ← Retour
          </button>
          <UserExplorer
            onViewProfile={(userId) => {
              setViewingProfileId(userId);
              setView('child-profile');
            }}
          />
        </div>
      )}

      {view === 'social' && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                if (isViewingAsChild) {
                  handleNavigationAttempt('home');
                } else if (profile?.role === 'parent') {
                  handleNavigationAttempt('parent-home');
                } else {
                  handleNavigationAttempt('home');
                }
              }}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour
            </button>
            <SocialFeed
              onProfileClick={(profileId) => {
                setViewingProfileId(profileId);
                setView('child-profile');
              }}
            />
          </div>
        </div>
      )}

      {view === 'friends' && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                if (profile?.role === 'parent') {
                  handleNavigationAttempt('parent-home');
                } else {
                  handleNavigationAttempt('home');
                }
              }}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour
            </button>
            <NetworkPanel
              onProfileClick={(profileId) => {
                setViewingProfileId(profileId);
                setView('child-profile');
              }}
            />
          </div>
        </div>
      )}

      {view === 'public-feed' && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                if (profile?.role === 'parent') {
                  handleNavigationAttempt('parent-home');
                } else {
                  handleNavigationAttempt('home');
                }
              }}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour
            </button>
            <SocialFeed
              onProfileClick={(profileId) => {
                setViewingProfileId(profileId);
                setView('child-profile');
              }}
            />
          </div>
        </div>
      )}

      {view === 'child-profile' && viewingProfileId && (
        viewingProfileId === profile?.id ? (
          <ChildProfile
            key={`profile-${viewingProfileId}-${profileRefreshKey}`}
            childId={viewingProfileId}
            onBack={() => {
              setViewingProfileId(null);
              handleNavigationAttempt('home');
            }}
            onStatusClick={() => setShowStatusSelector(true)}
            onAvatarClick={() => setShowAvatarCustomizer(true)}
          />
        ) : (
          <UserProfilePage
            userId={viewingProfileId}
            onBack={() => {
              setViewingProfileId(null);
              handleNavigationAttempt('home');
            }}
          />
        )
      )}

      {view === 'user-profile' && viewingProfileId && (
        <UserProfilePage
          userId={viewingProfileId}
          onBack={() => {
            setViewingProfileId(null);
            handleNavigationAttempt('home');
          }}
        />
      )}

      {view === 'battle-hub' && (
        <div className="container mx-auto px-4 py-8">
          <BattleHub
            childId={isViewingAsChild ? profile?.id : undefined}
            onClose={() => handleNavigationAttempt('home')}
            onBattleSelect={async (battleId) => {
              setActiveBattleId(battleId);

              const currentUserId = isViewingAsChild ? profile?.id : user?.id;

              const { data: battle } = await supabase
                .from('battles')
                .select('status, creator_id, opponent_id, creator_progress, opponent_progress, total_quizzes')
                .eq('id', battleId)
                .single();

              if (!battle) {
                setView('battle-hub');
                return;
              }

              const isCreator = battle.creator_id === currentUserId;
              const myProgress = isCreator ? battle.creator_progress : battle.opponent_progress;
              const iHaveFinished = myProgress === battle.total_quizzes;

              if (battle.status === 'completed' || battle.status === 'cancelled') {
                setView('battle-results');
              } else if (iHaveFinished) {
                setView('battle-results');
              } else if (battle.status === 'active') {
                setView('battle-arena');
              } else {
                setView('battle-waiting');
              }
            }}
          />
        </div>
      )}

      {view === 'battle-waiting' && activeBattleId && (
        <BattleWaitingRoom
          battleId={activeBattleId}
          onClose={() => {
            setActiveBattleId(null);
            handleNavigationAttempt('home');
          }}
          onBattleStart={() => {
            setView('battle-arena');
          }}
        />
      )}

      {view === 'battle-arena' && activeBattleId && (
        <BattleArena
          battleId={activeBattleId}
          childId={isViewingAsChild ? profile?.id : undefined}
          onComplete={() => {
            setView('battle-results');
          }}
        />
      )}

      {view === 'battle-results' && activeBattleId && (
        <BattleResults
          battleId={activeBattleId}
          childId={isViewingAsChild ? profile?.id : undefined}
          onClose={() => {
            setActiveBattleId(null);
            setView('battle-hub');
          }}
        />
      )}

      {showAuthModal && !profile && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {showAvatarCustomizer && (
        <AvatarCustomizer
          onClose={() => {
            setShowAvatarCustomizer(false);
            setProfileRefreshKey(prev => prev + 1);
          }}
          onSave={() => {
            setProfileRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showStatusSelector && (
        <StatusSelector onClose={() => {
          setShowStatusSelector(false);
          setProfileRefreshKey(prev => prev + 1);
        }} />
      )}

      {view === 'admin' && profile?.role === 'admin' && (
        <div className="container mx-auto px-4 py-8">
          <AdminPanel />
        </div>
      )}

      {view === 'contact' && (
        <ContactPage onBack={() => setView('home')} />
      )}

      {view === 'terms' && (
        <TermsPage onBack={() => setView('home')} />
      )}

      {view === 'privacy' && (
        <PrivacyPage onBack={() => setView('home')} />
      )}

      {view === 'legal' && (
        <LegalNoticePage onBack={() => setView('home')} />
      )}

      {!['contact', 'terms', 'privacy', 'legal', 'activity'].includes(view) && (
        <Footer
          onContactClick={() => setView('contact')}
          onTermsClick={() => setView('terms')}
          onPrivacyClick={() => setView('privacy')}
          onLegalClick={() => setView('legal')}
          onLogoClick={() => {
            if (user && profile) {
              if (profile.role === 'parent') {
                handleNavigationAttempt('parent-home');
              } else {
                handleNavigationAttempt('home');
              }
            } else {
              setView('landing');
            }
          }}
        />
      )}

      <AchievementNotification achievement={newAchievement} onClose={clearNewAchievement} />

      <ConfirmDialog
        isOpen={showQuizExitConfirm}
        title="Quitter le quiz ?"
        message="Vous êtes en train de faire un quiz. Si vous quittez maintenant, votre progression sera perdue. Voulez-vous vraiment quitter ?"
        confirmText="Quitter"
        cancelText="Rester"
        onConfirm={confirmQuizExit}
        onCancel={cancelQuizExit}
        variant="warning"
      />

      <CookieConsent onLearnMore={() => setView('privacy')} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AvatarRefreshProvider>
          <AppContent />
        </AvatarRefreshProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;