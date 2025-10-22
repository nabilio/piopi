import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const STORY_THEMES = {
  adventure: { name: 'Aventure', emoji: '🗺️', color: 'from-orange-500 to-red-500' },
  friendship: { name: 'Amitié', emoji: '🤝', color: 'from-pink-500 to-rose-500' },
  magic: { name: 'Magie', emoji: '✨', color: 'from-purple-500 to-indigo-500' },
  school: { name: 'École', emoji: '🎒', color: 'from-blue-500 to-cyan-500' },
  animals: { name: 'Animaux', emoji: '🦁', color: 'from-green-500 to-emerald-500' },
  nature: { name: 'Nature', emoji: '🌳', color: 'from-lime-500 to-green-500' },
  space: { name: 'Espace', emoji: '🚀', color: 'from-indigo-500 to-blue-500' },
  science: { name: 'Science', emoji: '🔬', color: 'from-cyan-500 to-teal-500' },
  sport: { name: 'Sport', emoji: '⚽', color: 'from-yellow-500 to-orange-500' },
  travel: { name: 'Voyage', emoji: '✈️', color: 'from-sky-500 to-blue-500' },
  mystery: { name: 'Énigmes', emoji: '🔍', color: 'from-slate-500 to-gray-600' }
};

type StoryCreatorProps = {
  childId: string;
  childName: string;
  gradeLevel: string;
  onClose: () => void;
  onStoryCreated: (storyId: string) => void;
};

export function StoryCreator({ childId, childName, gradeLevel, onClose, onStoryCreated }: StoryCreatorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [dailyCount, setDailyCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    checkDailyLimit();
  }, [childId]);

  useEffect(() => {
    if (selectedTheme) {
      const template = getThemeTemplate(selectedTheme);
      setDescription(template);
    }
  }, [selectedTheme]);

  async function checkDailyLimit() {
    const { data, error } = await supabase
      .from('daily_story_limit')
      .select('count')
      .eq('child_id', childId)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (!error && data) {
      setDailyCount(data.count);
    } else {
      setDailyCount(0);
    }
  }

  function getThemeTemplate(theme: string): string {
    const firstName = childName.split(' ')[0];
    const templates: Record<string, string> = {
      adventure: `${firstName} part explorer un lieu mystérieux plein de surprises.`,
      friendship: `${firstName} rencontre un nouvel ami et vit une belle aventure ensemble.`,
      magic: `Un objet ordinaire révèle un pouvoir magique à ${firstName}.`,
      school: `${firstName} vit une journée extraordinaire à l'école.`,
      animals: `${firstName} découvre un animal extraordinaire qui peut parler.`,
      nature: `${firstName} explore une forêt enchantée pleine de merveilles.`,
      space: `${firstName} voyage dans l'espace et découvre une planète inconnue.`,
      science: `${firstName} fait une expérience scientifique qui crée quelque chose d'incroyable.`,
      sport: `${firstName} participe à une compétition sportive passionnante.`,
      travel: `${firstName} voyage dans un pays lointain et découvre une nouvelle culture.`,
      mystery: `${firstName} doit résoudre une énigme mystérieuse avec l'aide de ses amis.`
    };
    return templates[theme] || '';
  }

  async function handleGenerate() {
    if (!selectedTheme || !description.trim()) {
      setError('Choisis un thème et écris une description');
      return;
    }

    if (dailyCount >= 3) {
      setError('Tu as déjà créé 3 histoires aujourd\'hui. Reviens demain !');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      console.log('Generating story with:', { childId, theme: selectedTheme, gradeLevel });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            childId,
            theme: selectedTheme,
            description,
            gradeLevel
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }
        throw new Error(errorData.message || errorData.error || 'Failed to generate story');
      }

      const result = await response.json();
      console.log('Story created:', result);

      if (!result.story || !result.story.id) {
        throw new Error('Histoire créée mais ID manquant');
      }

      await checkDailyLimit();
      onStoryCreated(result.story.id);
    } catch (err: any) {
      console.error('Error generating story:', err);
      if (err.name === 'AbortError') {
        setError('La génération prend trop de temps. Réessaye dans quelques instants.');
      } else {
        setError(err.message || 'Une erreur est survenue lors de la création de l\'histoire');
      }
    } finally {
      setGenerating(false);
    }
  }

  const remainingStories = Math.max(0, 3 - dailyCount);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={32} className="text-white" />
            <div>
              <h2 className="text-2xl font-black">Crée ton histoire du jour</h2>
              <p className="text-white/90 text-sm mt-1">
                {remainingStories > 0
                  ? `Il te reste ${remainingStories} histoire${remainingStories > 1 ? 's' : ''} à créer aujourd'hui`
                  : 'Limite quotidienne atteinte'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-center font-semibold">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-600" />
              Choisis ton thème
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(STORY_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedTheme === key
                      ? `bg-gradient-to-br ${theme.color} text-white border-transparent shadow-lg scale-105`
                      : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-3xl mb-2">{theme.emoji}</div>
                  <div className={`font-bold text-sm ${selectedTheme === key ? 'text-white' : 'text-gray-800'}`}>
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedTheme && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-lg font-bold text-gray-800 mb-2">
                  Décris ton histoire
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Tu peux modifier la description ou la laisser comme elle est
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800 min-h-[120px] resize-none"
                  placeholder="Décris l'histoire que tu veux créer..."
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !description.trim() || remainingStories === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg py-4 rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {generating ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    Création de ton histoire magique...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Générer mon histoire
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
