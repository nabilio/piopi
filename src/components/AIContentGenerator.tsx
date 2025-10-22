import { useState, useEffect } from 'react';
import { Sparkles, Loader2, BookOpen, FileQuestion, FileText, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Subject = {
  id: string;
  name: string;
  grade_levels?: string[];
};

type Chapter = {
  id: string;
  subject_id: string;
  title: string;
  grade_level: string;
};

type GeneratorType = 'quiz' | 'chapter' | 'activity' | 'subject';

type AIContentGeneratorProps = {
  subjects: Subject[];
  onContentGenerated: (type: GeneratorType, content: any) => void;
  offlineMode: boolean;
};

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const ACTIVITY_TYPES = ['quiz', 'exercise', 'story'];

export function AIContentGenerator({ subjects, onContentGenerated, offlineMode }: AIContentGeneratorProps) {
  const [generatorType, setGeneratorType] = useState<GeneratorType>('quiz');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [quizForm, setQuizForm] = useState({
    subjects: [] as string[],
    selectAllSubjects: false,
    chapters: [] as string[],
    selectAllChapters: false,
    gradeLevel: '',
    topic: '',
    numberOfQuestions: 10,
    difficulty: 'medium',
  });

  const [chapterForm, setChapterForm] = useState({
    subjects: [] as string[],
    selectAllSubjects: false,
    gradeLevel: '',
    topic: '',
    numberOfChapters: '',
  });

  const [activityForm, setActivityForm] = useState({
    subject: '',
    gradeLevel: '',
    chapter: '',
    activityType: 'quiz',
  });

  const [subjectForm, setSubjectForm] = useState({
    gradeLevel: '',
    schoolYear: new Date().getFullYear().toString(),
    numberOfSubjects: '',
  });

  useEffect(() => {
    loadChapters();
  }, [quizForm.subjects, quizForm.gradeLevel]);

  async function loadChapters() {
    if (quizForm.subjects.length === 0 && !quizForm.selectAllSubjects) {
      setChapters([]);
      return;
    }

    let query = supabase.from('chapters').select('*');

    if (quizForm.gradeLevel) {
      query = query.eq('grade_level', quizForm.gradeLevel);
    }

    if (!quizForm.selectAllSubjects && quizForm.subjects.length > 0) {
      query = query.in('subject_id', quizForm.subjects);
    }

    const { data } = await query.order('title');
    if (data) setChapters(data);
  }

  async function callAIFunction(endpoint: string, body: any) {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const fullUrl = `${baseUrl}/functions/v1/ai-content-generator${endpoint}`;

    const { data: { session } } = await supabase.auth.getSession();

    console.log('🚀 Calling AI function:', {
      endpoint,
      fullUrl,
      body,
      hasSession: !!session
    });

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ API Result:', result);
    return result;
  }

  async function handleGenerateQuiz() {
    if (subjects.length === 0) {
      setError('⚠️ Aucune matière disponible. Veuillez d\'abord générer des matières.');
      return;
    }

    if ((!quizForm.selectAllSubjects && quizForm.subjects.length === 0) || !quizForm.gradeLevel) {
      setError('Veuillez sélectionner au moins une matière et un niveau');
      return;
    }

    const availableSubjects = subjects.filter(s => s.grade_levels && s.grade_levels.includes(quizForm.gradeLevel));
    if (availableSubjects.length === 0) {
      setError(`⚠️ Aucune matière disponible pour le niveau ${quizForm.gradeLevel}. Veuillez d\'abord générer des matières pour ce niveau.`);
      return;
    }

    if (!quizForm.topic && quizForm.chapters.length === 0 && !quizForm.selectAllChapters) {
      setError('Veuillez sélectionner au moins un leçon ou spécifier un sujet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const targetSubjects = quizForm.selectAllSubjects
        ? subjects.filter(s => s.grade_levels && s.grade_levels.includes(quizForm.gradeLevel)).map(s => s.id)
        : quizForm.subjects;

      const targetChapters = quizForm.selectAllChapters
        ? chapters.filter(c => targetSubjects.includes(c.subject_id)).map(c => c.id)
        : quizForm.chapters;

      let totalQuizzes = 0;

      if (quizForm.topic && targetChapters.length === 0) {
        for (const subjectId of targetSubjects) {
          const subject = subjects.find(s => s.id === subjectId);
          if (!subject) continue;

          const payload = {
            subject: subject.name,
            gradeLevel: quizForm.gradeLevel,
            topic: quizForm.topic,
            numberOfQuestions: quizForm.numberOfQuestions,
            difficulty: quizForm.difficulty,
          };

          const result = await callAIFunction('/generate-quiz', payload);

          if (result.success) {
            onContentGenerated('quiz', {
              ...result.data,
              subject_id: subjectId,
              grade_level: quizForm.gradeLevel,
            });
            totalQuizzes++;
          }
        }
      } else {
        for (const chapterId of targetChapters) {
          const chapter = chapters.find(c => c.id === chapterId);
          if (!chapter) continue;

          const subject = subjects.find(s => s.id === chapter.subject_id);
          if (!subject) continue;

          const payload = {
            subject: subject.name,
            gradeLevel: quizForm.gradeLevel,
            chapter: chapter.title,
            topic: quizForm.topic || chapter.title,
            numberOfQuestions: quizForm.numberOfQuestions,
            difficulty: quizForm.difficulty,
          };

          const result = await callAIFunction('/generate-quiz', payload);

          if (result.success) {
            onContentGenerated('quiz', {
              ...result.data,
              subject_id: chapter.subject_id,
              chapter_id: chapter.id,
              grade_level: quizForm.gradeLevel,
            });
            totalQuizzes++;
          }
        }
      }

      setSuccess(`${totalQuizzes} quiz généré(s) !`);
      setQuizForm({
        subjects: [],
        selectAllSubjects: false,
        chapters: [],
        selectAllChapters: false,
        gradeLevel: '',
        topic: '',
        numberOfQuestions: 10,
        difficulty: 'medium',
      });
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      setError(err.message || 'Erreur lors de la génération du quiz');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateChapter() {
    if (subjects.length === 0) {
      setError('⚠️ Aucune matière disponible. Veuillez d\'abord générer des matières.');
      return;
    }

    if ((!chapterForm.selectAllSubjects && chapterForm.subjects.length === 0) || !chapterForm.gradeLevel) {
      setError('Veuillez sélectionner au moins une matière et un niveau');
      return;
    }

    const availableSubjects = subjects.filter(s => s.grade_levels && s.grade_levels.includes(chapterForm.gradeLevel));
    if (availableSubjects.length === 0) {
      setError(`⚠️ Aucune matière disponible pour le niveau ${chapterForm.gradeLevel}. Veuillez d\'abord générer des matières pour ce niveau.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const targetSubjects = chapterForm.selectAllSubjects
        ? subjects.filter(s => s.grade_levels && s.grade_levels.includes(chapterForm.gradeLevel)).map(s => s.id)
        : chapterForm.subjects;

      let totalChapters = 0;

      for (const subjectId of targetSubjects) {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) continue;

        const payload = {
          subject: subject.name,
          gradeLevel: chapterForm.gradeLevel,
          topic: chapterForm.topic || undefined,
          numberOfChapters: chapterForm.numberOfChapters ? parseInt(chapterForm.numberOfChapters) : undefined,
        };

        const result = await callAIFunction('/generate-chapter', payload);

        if (result.success) {
          const chaptersData = result.data.chapters || [result.data];

          for (const chapter of chaptersData) {
            onContentGenerated('chapter', {
              ...chapter,
              subject_id: subjectId,
              grade_level: chapterForm.gradeLevel,
            });
          }

          totalChapters += chaptersData.length;
        }
      }

      setSuccess(`${totalChapters} leçon(s) généré(s) pour ${targetSubjects.length} matière(s) !`);
      setChapterForm({
        subjects: [],
        selectAllSubjects: false,
        gradeLevel: '',
        topic: '',
        numberOfChapters: '',
      });
    } catch (err: any) {
      console.error('Error generating chapter:', err);
      setError(err.message || 'Erreur lors de la génération du leçon');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateActivity() {
    if (!activityForm.subject || !activityForm.gradeLevel || !activityForm.chapter) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const subject = subjects.find(s => s.id === activityForm.subject);
      if (!subject) {
        setError('Matière introuvable');
        return;
      }

      const payload = {
        subject: subject.name,
        gradeLevel: activityForm.gradeLevel,
        chapter: activityForm.chapter,
        activityType: activityForm.activityType,
      };

      const result = await callAIFunction('/generate-activity', payload);

      if (result.success) {
        onContentGenerated('activity', {
          ...result.data,
          subject_id: activityForm.subject,
          grade_level: activityForm.gradeLevel,
        });
        setSuccess('Activité générée avec succès !');
        setActivityForm({
          subject: '',
          gradeLevel: '',
          chapter: '',
          activityType: 'quiz',
        });
      }
    } catch (err: any) {
      console.error('Error generating activity:', err);
      setError(err.message || 'Erreur lors de la génération de l\'activité');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSubject() {
    if (!subjectForm.gradeLevel || !subjectForm.schoolYear) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        gradeLevel: subjectForm.gradeLevel,
        schoolYear: subjectForm.schoolYear,
        numberOfSubjects: subjectForm.numberOfSubjects ? parseInt(subjectForm.numberOfSubjects) : undefined,
      };

      const result = await callAIFunction('/generate-subjects', payload);

      if (result.success) {
        onContentGenerated('subject', result.data);
        setSuccess(`${result.data.subjects.length} matière(s) générée(s) avec succès !`);
        setSubjectForm({
          gradeLevel: '',
          schoolYear: new Date().getFullYear().toString(),
          numberOfSubjects: '',
        });
      }
    } catch (err: any) {
      console.error('Error generating subject:', err);
      setError(err.message || 'Erreur lors de la génération des matières');
    } finally {
      setLoading(false);
    }
  }

  if (offlineMode) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Mode Hors-ligne Activé</h3>
        <p className="text-gray-600">
          La génération de contenu par IA est désactivée en mode hors-ligne.
          Vous pouvez créer du contenu manuellement via les autres onglets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          Générateur de Contenu IA
        </h3>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setGeneratorType('subject')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            generatorType === 'subject'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Matières
        </button>
        <button
          onClick={() => setGeneratorType('quiz')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            generatorType === 'quiz'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          Quiz
        </button>
        <button
          onClick={() => setGeneratorType('chapter')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            generatorType === 'chapter'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Leçon
        </button>
        <button
          onClick={() => setGeneratorType('activity')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            generatorType === 'activity'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Activité
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {generatorType === 'quiz' && (
        <div className="space-y-4">
          {subjects.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Aucune matière disponible. Veuillez d'abord générer des matières dans l'onglet "Matières".
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau *
            </label>
            <select
              value={quizForm.gradeLevel}
              onChange={(e) => setQuizForm({ ...quizForm, gradeLevel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un niveau</option>
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matières *
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              <label className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizForm.selectAllSubjects}
                  onChange={(e) => setQuizForm({ ...quizForm, selectAllSubjects: e.target.checked, subjects: [] })}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="font-semibold text-blue-600">Toutes les matières du niveau</span>
              </label>
              {!quizForm.selectAllSubjects && subjects.filter(s => !quizForm.gradeLevel || (s.grade_levels && s.grade_levels.includes(quizForm.gradeLevel))).length === 0 && quizForm.gradeLevel && (
                <p className="text-sm text-gray-500 p-2">
                  Aucune matière disponible pour le niveau {quizForm.gradeLevel}
                </p>
              )}
              {!quizForm.selectAllSubjects && subjects.filter(s => !quizForm.gradeLevel || (s.grade_levels && s.grade_levels.includes(quizForm.gradeLevel))).map((subject) => (
                <label key={subject.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizForm.subjects.includes(subject.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setQuizForm({ ...quizForm, subjects: [...quizForm.subjects, subject.id] });
                      } else {
                        setQuizForm({ ...quizForm, subjects: quizForm.subjects.filter(id => id !== subject.id) });
                      }
                    }}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span>{subject.name}</span>
                </label>
              ))}
            </div>
          </div>

          {chapters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leçons (optionnel)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                <label className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizForm.selectAllChapters}
                    onChange={(e) => setQuizForm({ ...quizForm, selectAllChapters: e.target.checked, chapters: [] })}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="font-semibold text-blue-600">Tous les leçons</span>
                </label>
                {!quizForm.selectAllChapters && chapters.map((chapter) => {
                  const subject = subjects.find(s => s.id === chapter.subject_id);
                  return (
                    <label key={chapter.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quizForm.chapters.includes(chapter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuizForm({ ...quizForm, chapters: [...quizForm.chapters, chapter.id] });
                          } else {
                            setQuizForm({ ...quizForm, chapters: quizForm.chapters.filter(id => id !== chapter.id) });
                          }
                        }}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{chapter.title}</span>
                        <span className="text-gray-500"> - {subject?.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour générer un quiz général sur le sujet
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sujet du Quiz *
            </label>
            <input
              type="text"
              value={quizForm.topic}
              onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
              placeholder="Ex: Addition de fractions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Questions
              </label>
              <input
                type="number"
                min="3"
                max="20"
                value={quizForm.numberOfQuestions}
                onChange={(e) => setQuizForm({ ...quizForm, numberOfQuestions: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulté
              </label>
              <select
                value={quizForm.difficulty}
                onChange={(e) => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer le Quiz
              </>
            )}
          </button>
        </div>
      )}

      {generatorType === 'chapter' && (
        <div className="space-y-4">
          {subjects.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Aucune matière disponible. Veuillez d'abord générer des matières dans l'onglet "Matières".
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau *
            </label>
            <select
              value={chapterForm.gradeLevel}
              onChange={(e) => setChapterForm({ ...chapterForm, gradeLevel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un niveau</option>
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matières *
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              <label className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={chapterForm.selectAllSubjects}
                  onChange={(e) => setChapterForm({ ...chapterForm, selectAllSubjects: e.target.checked, subjects: [] })}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="font-semibold text-blue-600">Toutes les matières du niveau</span>
              </label>
              {!chapterForm.selectAllSubjects && subjects.filter(s => !chapterForm.gradeLevel || (s.grade_levels && s.grade_levels.includes(chapterForm.gradeLevel))).length === 0 && chapterForm.gradeLevel && (
                <p className="text-sm text-gray-500 p-2">
                  Aucune matière disponible pour le niveau {chapterForm.gradeLevel}
                </p>
              )}
              {!chapterForm.selectAllSubjects && subjects.filter(s => !chapterForm.gradeLevel || (s.grade_levels && s.grade_levels.includes(chapterForm.gradeLevel))).map((subject) => (
                <label key={subject.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chapterForm.subjects.includes(subject.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setChapterForm({ ...chapterForm, subjects: [...chapterForm.subjects, subject.id] });
                      } else {
                        setChapterForm({ ...chapterForm, subjects: chapterForm.subjects.filter(id => id !== subject.id) });
                      }
                    }}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span>{subject.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Laissez le sujet vide pour générer automatiquement tous les leçons du programme officiel pour les matières sélectionnées.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sujet du Leçon (optionnel)
            </label>
            <input
              type="text"
              value={chapterForm.topic}
              onChange={(e) => setChapterForm({ ...chapterForm, topic: e.target.value })}
              placeholder="Ex: Les fractions - Laissez vide pour tout générer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de Leçons (optionnel)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={chapterForm.numberOfChapters}
              onChange={(e) => setChapterForm({ ...chapterForm, numberOfChapters: e.target.value })}
              placeholder="Automatique selon le programme"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour générer tous les leçons du programme
            </p>
          </div>

          <button
            onClick={handleGenerateChapter}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer le Leçon
              </>
            )}
          </button>
        </div>
      )}

      {generatorType === 'subject' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              L'IA va générer une liste de matières adaptées au niveau scolaire et à l'année scolaire spécifiée, en suivant le programme officiel français.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau Scolaire *
              </label>
              <select
                value={subjectForm.gradeLevel}
                onChange={(e) => setSubjectForm({ ...subjectForm, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un niveau</option>
                {GRADE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année Scolaire *
              </label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={subjectForm.schoolYear}
                onChange={(e) => setSubjectForm({ ...subjectForm, schoolYear: e.target.value })}
                placeholder="Ex: 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de Matières (optionnel)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={subjectForm.numberOfSubjects}
              onChange={(e) => setSubjectForm({ ...subjectForm, numberOfSubjects: e.target.value })}
              placeholder="Automatique selon le programme"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour générer automatiquement toutes les matières du programme officiel
            </p>
          </div>

          <button
            onClick={handleGenerateSubject}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer les Matières
              </>
            )}
          </button>
        </div>
      )}

      {generatorType === 'activity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matière *
              </label>
              <select
                value={activityForm.subject}
                onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une matière</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau *
              </label>
              <select
                value={activityForm.gradeLevel}
                onChange={(e) => setActivityForm({ ...activityForm, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un niveau</option>
                {GRADE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leçon *
            </label>
            <input
              type="text"
              value={activityForm.chapter}
              onChange={(e) => setActivityForm({ ...activityForm, chapter: e.target.value })}
              placeholder="Ex: Les fractions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'Activité
            </label>
            <select
              value={activityForm.activityType}
              onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'quiz' ? 'Quiz' : type === 'exercise' ? 'Exercice' : 'Histoire'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateActivity}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer l'Activité
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
