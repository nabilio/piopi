import { useState, useEffect } from 'react';
import { ArrowLeft, BookPlus, BookOpen, Eye, Trash2, EyeOff, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type CustomLessonsListProps = {
  childId: string;
  childName: string;
  onBack: () => void;
  onCreateNew: () => void;
};

type CustomLesson = {
  id: string;
  subject: string;
  title: string;
  grade_level: string;
  content: string;
  quiz_data: any;
  is_published: boolean;
  created_at: string;
};

export function CustomLessonsList({ childId, childName, onBack, onCreateNew }: CustomLessonsListProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [lessons, setLessons] = useState<CustomLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<CustomLesson | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

  useEffect(() => {
    loadLessons();
    checkDailyLimit();
  }, [childId]);

  async function checkDailyLimit() {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('custom_lesson_generation_limits')
      .select('generation_count')
      .eq('parent_id', user.id)
      .eq('child_id', childId)
      .eq('date', today)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking limit:', error);
      return;
    }

    const count = data?.generation_count || 0;
    setRemainingGenerations(Math.max(0, 3 - count));
  }

  async function loadLessons() {
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_lessons')
      .select('*')
      .eq('parent_id', user.id)
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading lessons:', error);
      showToast('Erreur lors du chargement des leçons', 'error');
    } else {
      setLessons(data || []);
    }
    setLoading(false);
  }

  async function togglePublish(lessonId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('custom_lessons')
      .update({ is_published: !currentStatus })
      .eq('id', lessonId);

    if (error) {
      console.error('Error updating lesson:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } else {
      showToast(
        !currentStatus ? 'Leçon publiée' : 'Leçon masquée',
        'success'
      );
      loadLessons();
    }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) return;

    const { error } = await supabase
      .from('custom_lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error);
      showToast('Erreur lors de la suppression', 'error');
    } else {
      showToast('Leçon supprimée', 'success');
      loadLessons();
    }
  }

  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.subject]) {
      acc[lesson.subject] = [];
    }
    acc[lesson.subject].push(lesson);
    return acc;
  }, {} as Record<string, CustomLesson[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (selectedLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Retour à la liste
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedLesson.title}</h2>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold">
                    {selectedLesson.subject}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {selectedLesson.grade_level}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedLesson.is_published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedLesson.is_published ? 'Publiée' : 'Masquée'}
                  </span>
                </div>
              </div>
            </div>

            <div className="prose max-w-none mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Contenu de la leçon</h3>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedLesson.content}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quiz</h3>
              <div className="space-y-4">
                {selectedLesson.quiz_data?.map((q: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-semibold text-gray-800">
                        {idx + 1}. {q.question}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty === 'easy' ? 'Facile' : q.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-lg ${
                            optIdx === q.correct_answer
                              ? 'bg-green-50 border border-green-300'
                              : 'bg-gray-50'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => togglePublish(selectedLesson.id, selectedLesson.is_published)}
                className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                  selectedLesson.is_published
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600'
                }`}
              >
                {selectedLesson.is_published ? <EyeOff size={20} /> : <Eye size={20} />}
                {selectedLesson.is_published ? 'Masquer' : 'Publier'}
              </button>
              <button
                onClick={() => deleteLesson(selectedLesson.id)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition flex items-center gap-2"
              >
                <Trash2 size={20} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <button
            onClick={onCreateNew}
            className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 transition shadow-lg flex items-center gap-2"
          >
            <BookPlus size={20} />
            Créer une nouvelle leçon
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Cours personnalisés pour {childName}
          </h1>
          <p className="text-gray-600 mb-3">
            {lessons.length} leçon{lessons.length > 1 ? 's' : ''} créée{lessons.length > 1 ? 's' : ''}
          </p>
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-800 px-4 py-2 rounded-xl">
            <Sparkles size={18} />
            <span className="font-semibold">
              Générations restantes aujourd'hui : {remainingGenerations}/3
            </span>
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune leçon créée</h3>
            <p className="text-gray-600 mb-6">
              Commencez à créer des leçons personnalisées pour {childName}
            </p>
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 transition shadow-lg inline-flex items-center gap-2"
            >
              <BookPlus size={20} />
              Créer ma première leçon
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLessons).map(([subject, subjectLessons]) => (
              <div key={subject}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{subject}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-800 text-lg">{lesson.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          lesson.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {lesson.is_published ? '✓' : '○'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{lesson.grade_level}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{lesson.quiz_data?.length || 0} questions</span>
                        <span>{new Date(lesson.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
