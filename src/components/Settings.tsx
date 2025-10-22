import { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Bell, Check, X, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChildrenManager } from './ChildrenManager';
import { SubscriptionManager } from './SubscriptionManager';

type SettingsProps = {
  onBack: () => void;
  onUpgradePlan?: () => void;
  refreshTrigger?: number;
  initialTab?: 'profile' | 'security' | 'notifications' | 'subscription' | 'children';
};

export function Settings({ onBack, onUpgradePlan, refreshTrigger, initialTab }: SettingsProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'subscription' | 'children'>(initialTab || 'profile');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [friendNotifs, setFriendNotifs] = useState(true);
  const [achievementNotifs, setAchievementNotifs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0);

  // Refresh subscription data when switching to subscription tab
  useEffect(() => {
    if (activeTab === 'subscription') {
      setSubscriptionRefreshKey(prev => prev + 1);
    }
  }, [activeTab]);

  // Refresh subscription data when refreshTrigger changes (after upgrade/reactivation)
  useEffect(() => {
    if (refreshTrigger !== undefined && activeTab === 'subscription') {
      setSubscriptionRefreshKey(prev => prev + 1);
    }
  }, [refreshTrigger]);

  async function handleNameUpdate() {
    if (!user || !newName.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Nom mis à jour avec succès' });
      setEditingName(false);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating name:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du nom' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordUpdate() {
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour du mot de passe' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/90 hover:text-white transition mb-4"
          >
            <ArrowLeft size={24} />
            <span className="font-semibold">Retour</span>
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Paramètres</h1>
              <p className="text-sm sm:text-base text-white/90">Gérez votre compte et vos préférences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="flex border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold transition text-xs sm:text-base ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Profil</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold transition text-xs sm:text-base ${
                  activeTab === 'security'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lock size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Sécurité</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold transition text-xs sm:text-base ${
                  activeTab === 'notifications'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bell size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Notifications</span>
              </button>
              {profile?.role === 'parent' && (
                <>
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold transition text-xs sm:text-base ${
                      activeTab === 'subscription'
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard size={16} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Abonnement</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('children')}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold transition text-xs sm:text-base ${
                      activeTab === 'children'
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <User size={16} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Enfants</span>
                  </button>
                </>
              )}
            </div>

            <div className="p-4 sm:p-8">
              {message && (
                <div className={`mb-6 p-4 rounded-xl ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Informations du profil</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet
                    </label>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-blue-400 rounded-xl focus:outline-none text-sm sm:text-base"
                        />
                        <button
                          onClick={handleNameUpdate}
                          disabled={loading}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 sm:p-3 rounded-xl transition"
                        >
                          <Check size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false);
                            setNewName(profile?.full_name || '');
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white p-2 sm:p-3 rounded-xl transition"
                        >
                          <X size={18} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={profile?.full_name || ''}
                          disabled
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                        />
                        <button
                          onClick={() => setEditingName(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition text-sm sm:text-base"
                        >
                          Modifier
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rôle
                    </label>
                    <input
                      type="text"
                      value={
                        profile?.role === 'parent'
                          ? 'Parent'
                          : profile?.role === 'admin'
                          ? 'Administrateur'
                          : 'Élève'
                      }
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                    />
                  </div>

                  {profile?.role === 'child' && (
                    <>
                      {profile.grade_level && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Niveau scolaire
                          </label>
                          <input
                            type="text"
                            value={profile.grade_level}
                            disabled
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                          />
                        </div>
                      )}
                      {profile.department && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Département
                          </label>
                          <input
                            type="text"
                            value={profile.department}
                            disabled
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {profile?.role === 'parent' && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <ChildrenManager />
                    </div>
                  )}

                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Sécurité du compte</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmer le mot de passe"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handlePasswordUpdate}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 sm:px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                  >
                    {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                  </button>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Préférences de notifications</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-800">Notifications par email</p>
                        <p className="text-sm text-gray-600">Recevoir les notifications importantes par email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifs}
                          onChange={(e) => setEmailNotifs(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-800">Nouveaux amis</p>
                        <p className="text-sm text-gray-600">Être notifié des nouvelles demandes d'amis</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={friendNotifs}
                          onChange={(e) => setFriendNotifs(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-800">Succès débloqués</p>
                        <p className="text-sm text-gray-600">Notifications pour les nouveaux succès</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={achievementNotifs}
                          onChange={(e) => setAchievementNotifs(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'subscription' && profile?.role === 'parent' && (
                <SubscriptionManager
                  key={subscriptionRefreshKey}
                  onUpgrade={onUpgradePlan}
                />
              )}

              {activeTab === 'children' && profile?.role === 'parent' && (
                <ChildrenManager />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
