import { User, LogOut, Bell, Settings, LayoutDashboard, Globe, Users, Home, Shield, CircleUser as UserCircle, Menu, X, Share2, Star, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ParentNotificationsDropdown } from './ParentNotificationsDropdown';
import { Logo } from './Logo';
import { AvatarDisplay } from './AvatarDisplay';

type HeaderProps = {
  onAuthClick: () => void;
  onRegisterClick?: () => void;
  onActivityFeedClick?: () => void;
  onParentDashboardClick?: () => void;
  onPublicFeedClick?: () => void;
  onSettingsClick?: () => void;
  onNetworkClick?: () => void;
  onHomeClick?: () => void;
  onAdminClick?: () => void;
  onAvatarClick?: () => void;
  onNotificationsClick?: () => void;
  onExitChildProfile?: () => void;
  onProfileClick?: () => void;
  onBattleInvitationClick?: (battleId: string) => void;
};

export function Header({
  onAuthClick,
  onRegisterClick,
  onActivityFeedClick,
  onParentDashboardClick,
  onPublicFeedClick,
  onSettingsClick,
  onNetworkClick,
  onHomeClick,
  onAdminClick,
  onAvatarClick,
  onNotificationsClick,
  onExitChildProfile,
  onProfileClick,
  onBattleInvitationClick
}: HeaderProps) {
  const { user, profile, signOut, returnToParentProfile, isViewingAsChild } = useAuth();
  const { showToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [battleWins, setBattleWins] = useState(0);

  useEffect(() => {
    if (user && profile) {
      loadNotificationCount();
      if (profile.role === 'child') {
        loadChildStats();
      }
    }
  }, [user, profile]);

  async function loadChildStats() {
    if (!profile || profile.role !== 'child') return;

    const [pointsResult, battlesResult] = await Promise.all([
      supabase
        .from('progress')
        .select('score')
        .eq('child_id', profile.id)
        .eq('completed', true),
      supabase
        .from('battles')
        .select('id, winner_id')
        .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
        .eq('status', 'completed')
    ]);

    if (!pointsResult.error && pointsResult.data) {
      const total = pointsResult.data.reduce((sum, p) => sum + (p.score || 0), 0);
      setTotalPoints(total);
    }

    if (!battlesResult.error && battlesResult.data) {
      const wins = battlesResult.data.filter(b => b.winner_id === profile.id).length;
      setBattleWins(wins);
    }
  }

  async function loadNotificationCount() {
    if (!user || !profile) return;

    if (profile.role === 'parent') {
      const { count } = await supabase
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('is_read', false);

      setNotificationCount(count || 0);
    } else if (profile.role === 'admin') {
      const { count } = await supabase
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      setNotificationCount(count || 0);
    } else if (profile.role === 'child') {
      const [friendRequestsResult, battleNotificationsResult] = await Promise.all([
        supabase
          .from('friend_request_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_child_id', profile.id)
          .eq('is_read', false),
        supabase
          .from('battle_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .is('read_at', null)
      ]);

      const totalCount = (friendRequestsResult.count || 0) + (battleNotificationsResult.count || 0);
      setNotificationCount(totalCount);
    } else {
      setNotificationCount(0);
    }
  }


  async function markNotificationsAsRead() {
    if (!profile) return;

    try {
      if (profile.role === 'child') {
        await Promise.all([
          supabase
            .from('friend_request_notifications')
            .update({ is_read: true })
            .eq('recipient_child_id', profile.id)
            .eq('is_read', false),
          supabase
            .from('battle_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', profile.id)
            .is('read_at', null)
        ]);
      } else if (profile.role === 'parent') {
        await supabase
          .from('parent_notifications')
          .update({ is_read: true })
          .eq('parent_id', user?.id)
          .eq('is_read', false);
      } else if (profile.role === 'admin') {
        await supabase
          .from('parent_notifications')
          .update({ is_read: true })
          .eq('is_read', false);
      }

      await loadNotificationCount();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  if (isViewingAsChild) {
    return (
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onHomeClick}
              className="flex items-center gap-1.5 lg:gap-3 hover:opacity-80 transition cursor-pointer"
            >
              <Logo size={32} className="lg:hidden flex-shrink-0" />
              <Logo size={40} className="hidden lg:block flex-shrink-0" />
              <h1 className="text-base lg:text-xl font-bold">PioPi</h1>
            </button>

            <div className="lg:hidden flex items-center justify-center flex-1">
              {profile && (
                <span className="text-base font-bold">
                  {profile.full_name.split(' ')[0]}
                </span>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3 flex-1 justify-center">
              {onHomeClick && (
                <button
                  onClick={onHomeClick}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                >
                  <Home size={18} />
                  <span className="font-semibold">Accueil</span>
                </button>
              )}
              {onActivityFeedClick && (
                <button
                  onClick={onActivityFeedClick}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                >
                  <Users size={18} />
                  <span className="font-semibold">Réseau</span>
                </button>
              )}
              {onPublicFeedClick && (
                <button
                  onClick={onPublicFeedClick}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                >
                  <Globe size={18} />
                  <span className="font-semibold">Fil d'actualité</span>
                </button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {onProfileClick && profile?.role === 'child' && (
                <button
                  onClick={onProfileClick}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                >
                  <UserCircle size={20} />
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                  }}
                  className="relative bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {notificationCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationsDropdown
                    onClose={() => setShowNotifications(false)}
                    onBattleAccepted={(battleId) => {
                      setShowNotifications(false);
                      onBattleInvitationClick?.(battleId);
                    }}
                    onNotificationCountChange={loadNotificationCount}
                  />
                )}
              </div>
              <button
                onClick={async () => {
                  await returnToParentProfile();
                  onExitChildProfile?.();
                }}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full font-semibold transition backdrop-blur-sm"
              >
                <LogOut size={20} />
                Sortir
              </button>
            </div>

            <div className="lg:hidden flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 bg-yellow-400/20 px-1.5 py-0.5 rounded-lg">
                  <Star size={12} className="text-yellow-300" />
                  <span className="text-xs font-bold">{totalPoints}</span>
                </div>
                <div className="flex items-center gap-0.5 bg-orange-400/20 px-1.5 py-0.5 rounded-lg">
                  <Trophy size={12} className="text-orange-300" />
                  <span className="text-xs font-bold">{battleWins}</span>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition backdrop-blur-sm"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="lg:hidden mt-4 space-y-2 pb-2">
              {onHomeClick && (
                <button
                  onClick={() => {
                    onHomeClick();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                >
                  <Home size={20} />
                  <span className="font-semibold">Accueil</span>
                </button>
              )}
              <button
                onClick={async () => {
                  if (!showNotifications) {
                    setShowNotifications(true);
                    await markNotificationsAsRead();
                  } else {
                    setShowNotifications(false);
                  }
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-between gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <Bell size={20} />
                  <span className="font-semibold">Notifications</span>
                </div>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {notificationCount}
                  </span>
                )}
              </button>
              {onAvatarClick && (
                <button
                  onClick={() => {
                    onAvatarClick();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                >
                  <UserCircle size={20} />
                  <span className="font-semibold">Mon avatar</span>
                </button>
              )}
              {onActivityFeedClick && (
                <button
                  onClick={() => {
                    onActivityFeedClick();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                >
                  <Users size={20} />
                  <span className="font-semibold">Réseau</span>
                </button>
              )}
              {onPublicFeedClick && (
                <button
                  onClick={() => {
                    onPublicFeedClick();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                >
                  <Globe size={20} />
                  <span className="font-semibold">Fil d'actualité</span>
                </button>
              )}
              <button
                onClick={async () => {
                  await returnToParentProfile();
                  onExitChildProfile?.();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-red-500/80 hover:bg-red-600 px-4 py-3 rounded-xl font-semibold transition"
              >
                <LogOut size={20} />
                Sortir du profil enfant
              </button>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onHomeClick}
            className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
          >
            <Logo size={40} className="flex-shrink-0" />
            <h1 className="text-xl font-bold">PioPi</h1>
          </button>

          <div className="hidden lg:flex items-center gap-3 flex-1 justify-center">
            {user && profile && onHomeClick && (
              <button
                onClick={onHomeClick}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
              >
                <Home size={18} />
                <span className="font-semibold">Accueil</span>
              </button>
            )}
            {user && profile?.role === 'parent' && (
              <>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'PioPi',
                        text: 'Rejoignez PioPi, la plateforme éducative ludique pour vos enfants!',
                        url: window.location.origin
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      showToast('Lien copié dans le presse-papiers!', 'success');
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                  title="Inviter d'autres parents"
                >
                  <Share2 size={20} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                    }}
                    className="relative bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                  >
                    <Bell size={20} />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <ParentNotificationsDropdown
                      onClose={() => setShowNotifications(false)}
                      onNotificationCountChange={loadNotificationCount}
                    />
                  )}
                </div>
              </>
            )}
            {user && profile && (
              <>
                {onPublicFeedClick && (
                  <button
                    onClick={onPublicFeedClick}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <Globe size={18} />
                    <span className="font-semibold">Actualité</span>
                  </button>
                )}
                {onNetworkClick && (
                  <button
                    onClick={onNetworkClick}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <Users size={18} />
                    <span className="font-semibold">Réseau</span>
                  </button>
                )}
                {onAdminClick && profile?.role === 'admin' && (
                  <>
                    <button
                      onClick={onAdminClick}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition shadow-md"
                    >
                      <Shield size={18} />
                      <span className="font-semibold">Admin</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={async () => {
                          if (!showNotifications) {
                            setShowNotifications(true);
                            await markNotificationsAsRead();
                          } else {
                            setShowNotifications(false);
                          }
                        }}
                        className="relative bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                      >
                        <Bell size={20} />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                            {notificationCount}
                          </span>
                        )}
                      </button>
                      {showNotifications && (
                        <NotificationsDropdown
                          onClose={() => setShowNotifications(false)}
                          onBattleAccepted={(battleId) => {
                            setShowNotifications(false);
                            onBattleInvitationClick?.(battleId);
                          }}
                          onNotificationCountChange={loadNotificationCount}
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {user && profile?.role === 'child' && (
              <>
                <div className="relative">
                  <button
                    onClick={async () => {
                      if (!showNotifications) {
                        setShowNotifications(true);
                        await markNotificationsAsRead();
                      } else {
                        setShowNotifications(false);
                      }
                    }}
                    className="relative bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-sm"
                  >
                    <Bell size={20} />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationsDropdown
                      onClose={() => setShowNotifications(false)}
                      onBattleAccepted={(battleId) => {
                        setShowNotifications(false);
                        onBattleInvitationClick?.(battleId);
                      }}
                      onNotificationCountChange={loadNotificationCount}
                    />
                  )}
                </div>
              </>
            )}

            {user && profile ? (
              <>
                {profile?.role === 'parent' && onParentDashboardClick && (
                  <button
                    onClick={onParentDashboardClick}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <LayoutDashboard size={18} />
                    <span className="font-semibold">Tableau de bord</span>
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <User size={20} />
                    <span className="font-semibold">
                      {profile.role === 'child' ? profile.full_name.split(' ')[0] : profile.full_name}
                    </span>
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <p className="font-semibold text-gray-800">
                            {profile.role === 'child' ? profile.full_name.split(' ')[0] : profile.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {profile.role === 'parent' ? 'Parent' : profile.role === 'admin' ? 'Administrateur' : 'Élève'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onSettingsClick?.();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Settings size={18} />
                          <span>Paramètres</span>
                        </button>
                        <button
                          onClick={async () => {
                            setShowUserMenu(false);
                            try {
                              await signOut();
                            } catch (error) {
                              console.error('Erreur de déconnexion:', error);
                              showToast('Erreur lors de la déconnexion', 'error');
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition border-t"
                        >
                          <LogOut size={18} />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onAuthClick}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full font-semibold transition backdrop-blur-sm"
                >
                  <User size={20} />
                  Connexion
                </button>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            {user && profile?.role === 'parent' && (
              <>
                {onHomeClick && (
                  <button
                    onClick={onHomeClick}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition backdrop-blur-sm"
                    title="Accueil"
                  >
                    <Home size={20} />
                  </button>
                )}
                {onParentDashboardClick && (
                  <button
                    onClick={onParentDashboardClick}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition backdrop-blur-sm"
                    title="Tableau de bord"
                  >
                    <LayoutDashboard size={20} />
                  </button>
                )}
                {onSettingsClick && (
                  <button
                    onClick={onSettingsClick}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition backdrop-blur-sm"
                    title="Paramètres"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </>
            )}
            {user && profile && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition backdrop-blur-sm"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
            {!user && (
              <button
                onClick={onAuthClick}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full font-semibold transition backdrop-blur-sm"
              >
                <User size={18} />
                <span className="text-sm">Connexion</span>
              </button>
            )}
          </div>
        </div>

        {showMobileMenu && user && profile && (
          <div className="lg:hidden mt-4 space-y-2 pb-2">
            {onHomeClick && (
              <button
                onClick={() => {
                  onHomeClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <Home size={20} />
                <span className="font-semibold">Accueil</span>
              </button>
            )}
            {profile?.role === 'parent' && (
              <>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'PioPi',
                        text: 'Rejoignez PioPi, la plateforme éducative ludique pour vos enfants!',
                        url: window.location.origin
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      showToast('Lien copié dans le presse-papiers!', 'success');
                    }
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                >
                  <Share2 size={20} />
                  <span className="font-semibold">Inviter d'autres parents</span>
                </button>
                {onNotificationsClick && (
                  <button
                    onClick={() => {
                      onNotificationsClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={20} />
                      <span className="font-semibold">Notifications</span>
                    </div>
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
            {onPublicFeedClick && (
              <button
                onClick={() => {
                  onPublicFeedClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <Globe size={20} />
                <span className="font-semibold">Actualité</span>
              </button>
            )}
            {onNetworkClick && (
              <button
                onClick={() => {
                  onNetworkClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <Users size={20} />
                <span className="font-semibold">Réseau</span>
              </button>
            )}
            {profile?.role === 'admin' && (
              <>
                {onAdminClick && (
                  <button
                    onClick={() => {
                      onAdminClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-xl transition"
                  >
                    <Shield size={20} />
                    <span className="font-semibold">Panel Admin</span>
                  </button>
                )}
                {onNotificationsClick && (
                  <button
                    onClick={() => {
                      onNotificationsClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={20} />
                      <span className="font-semibold">Notifications Admin</span>
                    </div>
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
            {profile?.role === 'child' && onNotificationsClick && (
              <button
                onClick={() => {
                  onNotificationsClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-between gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <Bell size={20} />
                  <span className="font-semibold">Notifications</span>
                </div>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}
            {profile?.role === 'parent' && onParentDashboardClick && (
              <button
                onClick={() => {
                  onParentDashboardClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <LayoutDashboard size={20} />
                <span className="font-semibold">Tableau de bord</span>
              </button>
            )}
            {onSettingsClick && (
              <button
                onClick={() => {
                  onSettingsClick();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition backdrop-blur-sm"
              >
                <Settings size={20} />
                <span className="font-semibold">Paramètres</span>
              </button>
            )}
            <button
              onClick={async () => {
                setShowMobileMenu(false);
                try {
                  await signOut();
                } catch (error) {
                  console.error('Erreur de déconnexion:', error);
                  showToast('Erreur lors de la déconnexion', 'error');
                }
              }}
              className="w-full flex items-center gap-3 bg-red-500/80 hover:bg-red-600 px-4 py-3 rounded-xl font-semibold transition"
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
