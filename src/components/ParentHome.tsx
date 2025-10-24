import { useEffect, useState } from 'react';
import { Plus, Sparkles, Trophy, BookOpen, Brain, Target, Users, Star, Gamepad2, Share2, Baby, Book, CalendarHeart } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { AddChildModal } from './AddChildModal';

type ParentHomeProps = {
  onChildSelect: (childId: string) => void;
  onNavigate?: (view: string) => void;
};

export function ParentHome({ onChildSelect, onNavigate }: ParentHomeProps) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newChildData, setNewChildData] = useState({ full_name: '', age: '', grade_level: '' });
  const [addingChild, setAddingChild] = useState(false);
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

  useEffect(() => {
    if (user) {
      console.log('ParentHome: user loaded, fetching data');
      loadChildren();
      loadSubscription();
    } else {
      console.log('ParentHome: no user yet');
      setLoading(false);
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

  async function loadChildren() {
    if (!user) {
      console.log('No user found, cannot load children');
      return;
    }

    setLoading(true);
    console.log('Loading children for parent:', user.id);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', user.id);

      if (error) {
        console.error('Error loading children:', error);
      } else {
        console.log('Loaded children (all):', data);
        const childProfiles = (data || []).filter(p => p.role === 'child');
        console.log('Filtered child profiles:', childProfiles);
        setChildren(childProfiles);
      }
    } catch (err) {
      console.error('Exception loading children:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddChildSuccess() {
    setShowAddChild(false);
    loadChildren();
    loadSubscription();
  }

  async function handleAddChild() {
    if (!user || !newChildData.full_name || !newChildData.age || !newChildData.grade_level) return;

    setAddingChild(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-child-profile', {
        body: {
          name: newChildData.full_name,
          age: parseInt(newChildData.age),
          gradeLevel: newChildData.grade_level,
        }
      });

      if (error) throw error;

      setNewChildData({ full_name: '', age: '', grade_level: '' });
      handleAddChildSuccess();
    } catch (error) {
      console.error('Error adding child:', error);
      alert('Erreur lors de l\'ajout de l\'enfant. Veuillez réessayer.');
    } finally {
      setAddingChild(false);
    }
  }

  async function handleShare() {
    const inviteUrl = `${window.location.origin}`;
    const shareText = `Rejoignez PioPi - Plateforme d'apprentissage ludique pour enfants du CP au CM2\n\n✨ Programme officiel de l'Éducation Nationale 2025\n🎮 Apprentissage gamifié avec récompenses\n🤖 Coach IA disponible 24/7\n📊 Suivi de progression en temps réel\n\nInscrivez-vous sur : ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invitation PioPi',
          text: shareText,
          url: inviteUrl
        });
        setShowInviteModal(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      setShowInviteModal(true);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Accueil Parent
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {children.length === 0
                  ? "Commencez l'aventure en ajoutant votre premier enfant"
                  : "Choisissez un profil pour commencer l'apprentissage"}
              </p>
            </div>
            {subscription && children.length > 0 && (
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
                    onClick={() => setShowAddChild(true)}
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
            )}
          </div>
        </div>


        {children.length === 0 ? (
          <>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center mb-8">
              <div className="text-6xl sm:text-8xl mb-6">👶</div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-4">
                Aucun enfant enregistré
              </h2>
              <p className="text-base sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Créez le profil de votre enfant pour débloquer un monde d'apprentissage ludique et interactif !
              </p>
              <button
                onClick={() => setShowAddChild(true)}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-lg sm:text-xl font-bold px-8 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition"
              >
                <Plus size={24} className="sm:w-7 sm:h-7" />
                Ajouter mon premier enfant
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                    <BookOpen size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Programme Officiel 2025</h3>
                  <p className="text-gray-600">
                    Contenu aligné sur le programme de l'Éducation Nationale, du CP au CM2
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                    <Gamepad2 size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Apprentissage Ludique</h3>
                  <p className="text-gray-600">
                    Jeux, quiz interactifs et activités amusantes pour apprendre en s'amusant
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                    <Brain size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Coach IA Personnel</h3>
                  <p className="text-gray-600">
                    Un assistant intelligent qui guide et encourage votre enfant dans ses devoirs
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                    <Trophy size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Système de Récompenses</h3>
                  <p className="text-gray-600">
                    Points, badges et défis pour motiver et célébrer les progrès
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center mb-4">
                    <Target size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Suivi des Progrès</h3>
                  <p className="text-gray-600">
                    Tableau de bord détaillé pour suivre l'évolution de votre enfant
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Réseau Social Éducatif</h3>
                  <p className="text-gray-600">
                    Connectez-vous avec d'autres élèves et partagez les succès
                  </p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                    <Book size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Histoires Personnalisées</h3>
                  <p className="text-gray-600">
                    Créez des histoires uniques adaptées à votre enfant avec quiz intégré
                  </p>
                </div>
              </div>
            </>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {showAddChild && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-400 to-teal-400 rounded-xl sm:rounded-full flex items-center justify-center shadow-lg">
                    <Baby size={24} className="text-white sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Ajouter un enfant</h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={newChildData.full_name}
                      onChange={(e) => setNewChildData({ ...newChildData, full_name: e.target.value })}
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                      placeholder="Ex: Marie Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Âge
                    </label>
                    <input
                      type="number"
                      value={newChildData.age}
                      onChange={(e) => setNewChildData({ ...newChildData, age: e.target.value })}
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                      placeholder="Ex: 8"
                      min="5"
                      max="18"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Niveau scolaire
                    </label>
                    <select
                      value={newChildData.grade_level}
                      onChange={(e) => setNewChildData({ ...newChildData, grade_level: e.target.value })}
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-lg"
                    >
                      <option value="">Sélectionnez un niveau</option>
                      <option value="CP">CP</option>
                      <option value="CE1">CE1</option>
                      <option value="CE2">CE2</option>
                      <option value="CM1">CM1</option>
                      <option value="CM2">CM2</option>
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleAddChild}
                      disabled={!newChildData.full_name || !newChildData.age || !newChildData.grade_level || addingChild}
                      className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-4 rounded-xl transition text-lg shadow-lg hover:shadow-xl"
                    >
                      {addingChild ? 'Ajout en cours...' : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddChild(false);
                        setNewChildData({ full_name: '', age: '', grade_level: '' });
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition text-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {children.map((child) => (
                <div key={child.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
                  <button
                    onClick={() => onChildSelect(child.id)}
                    className="w-full group text-left"
                  >
                    <div className="flex flex-col items-center text-center gap-3 sm:gap-4 mb-4">
                      <div className="relative">
                        <AvatarDisplay
                          userId={child.id}
                          fallbackName={child.full_name}
                          size="lg"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 sm:p-2 shadow-lg">
                          <Trophy size={16} className="text-yellow-900 sm:w-5 sm:h-5" />
                        </div>
                      </div>
                      <div className="w-full">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 group-hover:text-purple-600 transition mb-2 truncate">
                          {child.full_name}
                        </h3>
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span className="bg-blue-100 px-2.5 py-1 rounded-full text-xs font-bold text-blue-700">
                            {child.age} ans
                          </span>
                          {child.grade_level && (
                            <span className="bg-green-100 px-2.5 py-1 rounded-full text-xs font-bold text-green-700">
                              {child.grade_level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-3 group-hover:from-purple-200 group-hover:to-pink-200 transition">
                      <p className="text-xs sm:text-sm font-bold text-purple-700 text-center">
                        Commencer l'aventure ! ✨
                      </p>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-600 shadow-md">
                    <CalendarHeart size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Anniversaires & Invitations</h3>
                    <p className="text-sm text-gray-600">Suivez les dates clés et confirmez rapidement les invitations.</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">Chaque enfant peut renseigner sa date d'anniversaire depuis son espace pour débloquer des surprises personnalisées.</p>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('parent-birthdays')}
                  className="inline-flex items-center gap-2 self-start rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-purple-600 shadow transition hover:bg-purple-50"
                >
                  <CalendarHeart size={18} />
                  Gérer les anniversaires
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Share2 size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Partager PioPi</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Partagez PioPi avec d'autres parents et aidez leurs enfants à apprendre en s'amusant !
            </p>

            <div className="space-y-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Rejoignez PioPi - Plateforme d'apprentissage ludique pour enfants du CP au CM2\n\n✨ Programme officiel de l'Éducation Nationale 2025\n🎮 Apprentissage gamifié\n🤖 Coach IA 24/7\n\nInscrivez-vous : ${window.location.origin}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-6 py-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold rounded-xl transition"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent('Invitation à rejoindre PioPi')}&body=${encodeURIComponent(`Rejoignez PioPi - Plateforme d'apprentissage ludique pour enfants du CP au CM2\n\n✨ Programme officiel de l'Éducation Nationale 2025\n🎮 Apprentissage gamifié avec récompenses\n🤖 Coach IA disponible 24/7\n📊 Suivi de progression en temps réel\n\nInscrivez-vous sur : ${window.location.origin}`)}`}
                className="flex items-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Rejoignez PioPi - Plateforme d'apprentissage ludique pour enfants du CP au CM2\n\n✨ Programme officiel de l'Éducation Nationale 2025\n🎮 Apprentissage gamifié\n🤖 Coach IA 24/7\n\nInscrivez-vous : ${window.location.origin}`);
                  alert('Lien copié dans le presse-papiers !');
                }}
                className="flex items-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      )}

      <AddChildModal
        isOpen={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSuccess={handleAddChildSuccess}
        existingChildrenCount={children.length}
        maxChildren={subscription ? getMaxChildren() : 1}
        planType={subscription?.plan_type || 'basic'}
      />
    </div>
  );
}
