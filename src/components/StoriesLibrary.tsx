import { useState, useEffect } from 'react';
import { BookOpen, Clock, Trophy, Plus, X, ArrowLeft, Sparkles, Home, Users, Globe, LogOut, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StoryCreator } from './StoryCreator';
import { StoryReader } from './StoryReader';
import { StoryQuiz } from './StoryQuiz';
import { StoryPreview } from './StoryPreview';
import { AvatarDisplay } from './AvatarDisplay';
import { Logo } from './Logo';

type Story = {
  id: string;
  title: string;
  theme: string;
  content: string;
  grade_level: string;
  created_at: string;
  is_approved: boolean;
  lastScore?: number;
  totalQuestions?: number;
};

type StoriesLibraryProps = {
  childId?: string;
  onClose: () => void;
};

export function StoriesLibrary({ childId, onClose }: StoriesLibraryProps) {
  const { profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [childData, setChildData] = useState<any>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [previewStoryId, setPreviewStoryId] = useState<string | null>(null);

  const currentChildId = childId || profile?.id;
  const isParentViewing = !!childId;

  useEffect(() => {
    if (currentChildId) {
      loadStories();
      loadChildData();
      loadDailyCount();
    }
  }, [currentChildId]);

  async function loadChildData() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, grade_level')
      .eq('id', currentChildId)
      .single();

    if (!error && data) {
      setChildData(data);
    }
  }

  async function loadDailyCount() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('daily_story_limit')
      .select('count')
      .eq('child_id', currentChildId)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (!error && data) {
      setDailyCount(data.count);
    } else {
      setDailyCount(0);
    }
  }

  async function loadStories() {
    if (!currentChildId) return;

    setLoading(true);

    let query = supabase
      .from('stories')
      .select('*')
      .eq('child_id', currentChildId);

    if (!isParentViewing) {
      query = query.eq('is_published', true);
    }

    const { data: storiesData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stories:', error);
      setLoading(false);
      return;
    }

    const storiesWithScores = await Promise.all(
      (storiesData || []).map(async (story) => {
        const { data: attempt } = await supabase
          .from('story_attempts')
          .select('score, total_questions')
          .eq('story_id', story.id)
          .eq('child_id', currentChildId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...story,
          lastScore: attempt?.score,
          totalQuestions: attempt?.total_questions
        };
      })
    );

    setStories(storiesWithScores);
    setLoading(false);
  }

  async function handleStoryCreated(storyId: string) {
    setShowCreator(false);
    setPreviewStoryId(storyId);
  }

  async function handleStoryPublished() {
    setPreviewStoryId(null);
    await loadStories();
    await loadDailyCount();
  }

  function handleReadStory(story: Story) {
    setSelectedStory(story);
  }

  function handleStartQuiz() {
    setShowQuiz(true);
  }

  function handleCloseQuiz() {
    setShowQuiz(false);
    setSelectedStory(null);
  }

  const THEME_COLORS: Record<string, string> = {
    adventure: 'from-orange-500 to-red-500',
    friendship: 'from-pink-500 to-rose-500',
    magic: 'from-purple-500 to-indigo-500',
    school: 'from-blue-500 to-cyan-500',
    animals: 'from-green-500 to-emerald-500',
    nature: 'from-lime-500 to-green-500',
    space: 'from-indigo-500 to-blue-500',
    science: 'from-cyan-500 to-teal-500',
    sport: 'from-yellow-500 to-orange-500',
    travel: 'from-sky-500 to-blue-500',
    mystery: 'from-slate-500 to-gray-600'
  };

  if (previewStoryId) {
    return (
      <StoryPreview
        storyId={previewStoryId}
        onClose={() => setPreviewStoryId(null)}
        onPublished={handleStoryPublished}
      />
    );
  }

  if (showCreator && childData) {
    return (
      <StoryCreator
        childId={currentChildId!}
        childName={childData.full_name}
        gradeLevel={childData.grade_level}
        onClose={() => setShowCreator(false)}
        onStoryCreated={handleStoryCreated}
      />
    );
  }

  if (selectedStory && showQuiz && childData) {
    return (
      <StoryQuiz
        storyId={selectedStory.id}
        childId={currentChildId!}
        childName={childData.full_name}
        onClose={handleCloseQuiz}
      />
    );
  }

  if (selectedStory) {
    return (
      <StoryReader
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
        onStartQuiz={handleStartQuiz}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 z-50 overflow-auto">
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
            >
              <Logo size={40} className="flex-shrink-0" />
              <h1 className="text-xl font-bold">PioPi</h1>
            </button>

            {isParentViewing ? (
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                  <span className="font-semibold">Mode Parent - Histoires de {childData?.full_name}</span>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                >
                  <ArrowLeft size={18} />
                  <span className="font-semibold">Retour au tableau de bord</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <Home size={18} />
                    <span className="font-semibold">Accueil</span>
                  </button>
                  <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm">
                    <Users size={18} />
                    <span className="font-semibold">Réseau</span>
                  </button>
                  <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm">
                    <Globe size={18} />
                    <span className="font-semibold">Fil d'actualité</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button className="relative p-2 hover:bg-white/20 rounded-full transition">
                    <Bell size={20} />
                  </button>
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition backdrop-blur-sm"
                  >
                    <LogOut size={18} />
                    <span className="font-semibold">Sortir</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-md"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold">Retour</span>
          </button>
        </div>

        <h1 className="text-4xl font-black text-gray-800 mb-8 flex items-center justify-center gap-3">
          <BookOpen size={36} className="text-purple-600" />
          {isParentViewing ? `Histoires de ${childData?.full_name}` : 'Mes histoires'}
        </h1>

        {isParentViewing ? (
          <div className="mb-8 space-y-4">
            <button
              onClick={() => setShowCreator(true)}
              disabled={dailyCount >= 3}
              className={`w-full font-black text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-3 ${
                dailyCount >= 3
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl'
              }`}
            >
              <Plus size={24} />
              Créer une histoire pour {childData?.full_name}
            </button>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={24} className="text-purple-600" />
                  <div>
                    <p className="font-bold text-gray-800">Histoires d'aujourd'hui</p>
                    <p className="text-sm text-gray-600">3 histoires maximum par jour</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-purple-600">{dailyCount}/3</p>
                  <p className="text-sm font-semibold text-gray-600">
                    {dailyCount >= 3 ? 'Limite atteinte' : `${3 - dailyCount} restante${3 - dailyCount > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-white rounded-full p-3 shadow-md">
                  <Sparkles size={28} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg mb-2">
                    Demande à tes parents de créer une histoire !
                  </p>
                  <p className="text-gray-700">
                    Tes parents peuvent générer des histoires personnalisées et des quiz rien que pour toi depuis leur profil parent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
            <p className="mt-4 text-gray-600">Chargement de tes histoires...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
            <BookOpen size={64} className="text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-600 mb-2">
              Aucune histoire pour le moment
            </p>
            <p className="text-gray-500">
              Crée ta première histoire en cliquant sur le bouton ci-dessus !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group"
              >
                <div className={`h-32 bg-gradient-to-r ${THEME_COLORS[story.theme] || 'from-gray-500 to-gray-600'} p-6 flex items-center justify-center relative`}>
                  <BookOpen size={48} className="text-white group-hover:scale-110 transition-transform" />
                  {isParentViewing && !story.is_published && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-white rounded-lg px-3 py-1.5 shadow-lg">
                      <span className="font-bold text-xs">BROUILLON</span>
                    </div>
                  )}
                  {story.lastScore !== undefined && story.totalQuestions && (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-500" />
                        <span className="font-bold text-gray-800">
                          {story.lastScore}/{story.totalQuestions}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                    {story.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock size={16} />
                    <span>{new Date(story.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {isParentViewing && !story.is_published ? (
                    <button
                      onClick={() => setPreviewStoryId(story.id)}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all"
                    >
                      Prévisualiser et publier
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReadStory(story)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all"
                    >
                      Lire l'histoire
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
