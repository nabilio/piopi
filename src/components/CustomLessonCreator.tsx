import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, BookOpen, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type CustomLessonCreatorProps = {
  childId: string;
  childName: string;
  onBack: () => void;
  onClose: () => void;
};

type GeneratedLesson = {
  title: string;
  subject: string;
  grade_level: string;
  content: string;
  quiz: Array<{
    question: string;
    options: string[];
    correct_answer: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
};

export function CustomLessonCreator({ childId, childName, onBack, onClose }: CustomLessonCreatorProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    loadChildGradeLevel();
    checkDailyLimit();
  }, [childId]);

  async function loadChildGradeLevel() {
    const { data } = await supabase
      .from('profiles')
      .select('school_level, grade_level')
      .eq('id', childId)
      .maybeSingle();

    if (data) {
      // Essayer school_level en premier, puis grade_level, sinon valeur par défaut
      const level = data.school_level || data.grade_level || 'Non défini';
      setGradeLevel(level);
    } else {
      setGradeLevel('Non défini');
    }
  }

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

  async function validateInputs(): Promise<boolean> {
    setValidationError('');

    if (!subject.trim() || !title.trim()) {
      setValidationError('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (subject.length > 50) {
      setValidationError('La matière doit faire moins de 50 caractères');
      return false;
    }

    if (title.length > 100) {
      setValidationError('Le nom de la leçon doit faire moins de 100 caractères');
      return false;
    }

    if (description.length > 500) {
      setValidationError('La description doit faire moins de 500 caractères');
      return false;
    }

    const inappropriateWords = ['inapproprié', 'interdit', 'malveillant'];
    const combinedText = `${subject} ${title} ${description}`.toLowerCase();

    if (inappropriateWords.some(word => combinedText.includes(word))) {
      setValidationError('Le contenu semble inapproprié. Veuillez rester dans un cadre éducatif.');
      return false;
    }

    const educationalKeywords = ['math', 'français', 'science', 'histoire', 'géographie', 'anglais', 'lecture', 'écriture', 'calcul', 'grammaire', 'conjugaison', 'orthographe', 'biologie', 'physique', 'chimie', 'art', 'musique', 'sport', 'leçon', 'cours', 'apprendre'];
    const hasEducationalContext = educationalKeywords.some(keyword => combinedText.includes(keyword));

    if (!hasEducationalContext && (subject.length < 3 || title.length < 5)) {
      setValidationError('Veuillez entrer une matière et une leçon éducatives valides.');
      return false;
    }

    return true;
  }

  async function handleGenerate() {
    if (!user || remainingGenerations <= 0) {
      showToast('Limite quotidienne atteinte (3 générations par jour)', 'error');
      return;
    }

    const isValid = await validateInputs();
    if (!isValid) {
      showToast(validationError, 'error');
      return;
    }

    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expirée, veuillez vous reconnecter', 'error');
        setGenerating(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-custom-lesson`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject,
            gradeLevel,
            title,
            description,
            childId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Erreur lors de la génération';
        console.error('Generation error:', data);
        showToast(errorMessage, 'error');
        setGenerating(false);
        return;
      }

      setGeneratedLesson(data.lesson);
      setRemainingGenerations(prev => prev - 1);
      showToast('Leçon générée avec succès !', 'success');
    } catch (error) {
      console.error('Error generating lesson:', error);
      showToast('Erreur lors de la génération de la leçon', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (!user || !generatedLesson) return;

    try {
      const { error } = await supabase.from('custom_lessons').insert({
        parent_id: user.id,
        child_id: childId,
        subject: generatedLesson.subject,
        title: generatedLesson.title,
        grade_level: generatedLesson.grade_level,
        content: generatedLesson.content,
        quiz_data: generatedLesson.quiz,
        is_published: true,
      });

      if (error) throw error;

      showToast('Leçon publiée avec succès !', 'success');
      onBack();
    } catch (error) {
      console.error('Error publishing lesson:', error);
      showToast('Erreur lors de la publication', 'error');
    }
  }

  if (generatedLesson && editMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Retour à l'aperçu
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Modifier la leçon</h2>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre de la leçon
                </label>
                <input
                  type="text"
                  value={generatedLesson.title}
                  onChange={(e) => setGeneratedLesson({ ...generatedLesson, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contenu de la leçon
                </label>
                <textarea
                  value={generatedLesson.content}
                  onChange={(e) => setGeneratedLesson({ ...generatedLesson, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Modifier les questions du quiz</h3>
              <div className="space-y-6">
                {generatedLesson.quiz.map((q, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    <div className="flex items-start justify-between mb-4">
                      <label className="block text-sm font-semibold text-gray-700">
                        Question {idx + 1}
                      </label>
                      <select
                        value={q.difficulty}
                        onChange={(e) => {
                          const newQuiz = [...generatedLesson.quiz];
                          newQuiz[idx] = { ...q, difficulty: e.target.value as 'easy' | 'medium' | 'hard' };
                          setGeneratedLesson({ ...generatedLesson, quiz: newQuiz });
                        }}
                        className="text-xs px-3 py-1 rounded-full font-semibold border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="easy">Facile</option>
                        <option value="medium">Moyen</option>
                        <option value="hard">Difficile</option>
                      </select>
                    </div>
                    <textarea
                      value={q.question}
                      onChange={(e) => {
                        const newQuiz = [...generatedLesson.quiz];
                        newQuiz[idx] = { ...q, question: e.target.value };
                        setGeneratedLesson({ ...generatedLesson, quiz: newQuiz });
                      }}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
                    />

                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Options de réponse
                    </label>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correct_answer === optIdx}
                            onChange={() => {
                              const newQuiz = [...generatedLesson.quiz];
                              newQuiz[idx] = { ...q, correct_answer: optIdx };
                              setGeneratedLesson({ ...generatedLesson, quiz: newQuiz });
                            }}
                            className="w-4 h-4 text-violet-600"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newQuiz = [...generatedLesson.quiz];
                              const newOptions = [...q.options];
                              newOptions[optIdx] = e.target.value;
                              newQuiz[idx] = { ...q, options: newOptions };
                              setGeneratedLesson({ ...generatedLesson, quiz: newQuiz });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setEditMode(false)}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-600 transition shadow-lg"
            >
              Enregistrer les modifications
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-4 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (generatedLesson && !editMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setGeneratedLesson(null)}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Nouvelle génération
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{generatedLesson.title}</h2>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold">
                    {generatedLesson.subject}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {generatedLesson.grade_level}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <Edit size={18} />
                Modifier
              </button>
            </div>

            <div className="prose max-w-none mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen size={24} className="text-violet-600" />
                Contenu de la leçon
              </h3>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {generatedLesson.content}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quiz (6 questions)</h3>
              <div className="space-y-4">
                {generatedLesson.quiz.map((q, idx) => (
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
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-lg ${
                            optIdx === q.correct_answer
                              ? 'bg-green-50 border border-green-300'
                              : 'bg-gray-50'
                          }`}
                        >
                          {opt}
                          {optIdx === q.correct_answer && (
                            <CheckCircle size={16} className="inline ml-2 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePublish}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-600 transition shadow-lg"
            >
              Publier cette leçon
            </button>
            <button
              onClick={() => setGeneratedLesson(null)}
              className="px-6 py-4 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-6"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Créer une leçon pour {childName}
          </h2>
          <p className="text-gray-600 mb-2">
            Générations restantes aujourd'hui : <strong>{remainingGenerations}/3</strong>
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Astuce :</strong> Restez dans un cadre éducatif. Décrivez une matière scolaire (maths, français, sciences, etc.) et une leçon adaptée au niveau de l'enfant.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Matière * <span className="text-xs text-gray-500">(max 50 caractères)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={50}
                placeholder="Ex: Mathématiques, Histoire, Sciences..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Niveau scolaire
              </label>
              <input
                type="text"
                value={gradeLevel || 'Non défini'}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                {gradeLevel && gradeLevel !== 'Non défini'
                  ? 'Le niveau est déterminé par le profil de l\'enfant'
                  : 'Veuillez définir un niveau scolaire dans le profil de l\'enfant'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de la leçon * <span className="text-xs text-gray-500">(max 100 caractères)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Ex: Les volcans, Les fractions, Les animaux..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (optionnelle) <span className="text-xs text-gray-500">(max 500 caractères)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Décrivez brièvement ce que vous souhaitez que l'enfant apprenne..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500 caractères</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || remainingGenerations <= 0}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Générer la leçon et le quiz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
