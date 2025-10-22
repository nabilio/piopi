import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Play, CheckCircle, XCircle, X, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { AvatarDisplay } from './AvatarDisplay';
import { Logo } from './Logo';

type CustomLessonsChildProps = {
  childId?: string;
  onClose: () => void;
};

type CustomLesson = {
  id: string;
  subject: string;
  title: string;
  grade_level: string;
  content: string;
  quiz_data: Array<{
    question: string;
    options: string[];
    correct_answer: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
};

type LessonProgress = {
  quiz_score: number;
  quiz_total: number;
};

export function CustomLessonsChild({ childId, onClose }: CustomLessonsChildProps) {
  const { showToast } = useToast();
  const [lessons, setLessons] = useState<CustomLesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [selectedLesson, setSelectedLesson] = useState<CustomLesson | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [childProfile, setChildProfile] = useState<any>(null);

  useEffect(() => {
    if (childId) {
      loadLessons();
      loadChildProfile();
    }
  }, [childId]);

  async function loadChildProfile() {
    if (!childId) return;

    const { data } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('id', childId)
      .single();

    if (data) {
      setChildProfile(data);
    }
  }

  async function loadLessons() {
    if (!childId) return;

    const { data, error } = await supabase
      .from('custom_lessons')
      .select('*')
      .eq('child_id', childId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading lessons:', error);
      showToast('Erreur lors du chargement des leçons', 'error');
    } else {
      setLessons(data || []);
      await loadProgress(data || []);
    }
    setLoading(false);
  }

  async function loadProgress(lessonsList: CustomLesson[]) {
    if (!childId || lessonsList.length === 0) return;

    const { data } = await supabase
      .from('custom_lesson_progress')
      .select('lesson_id, quiz_score, quiz_total')
      .eq('child_id', childId)
      .in('lesson_id', lessonsList.map(l => l.id));

    if (data) {
      const progressMap: Record<string, LessonProgress> = {};
      data.forEach(p => {
        progressMap[p.lesson_id] = {
          quiz_score: p.quiz_score,
          quiz_total: p.quiz_total
        };
      });
      setLessonProgress(progressMap);
    }
  }

  async function submitQuiz() {
    if (!selectedLesson || !childId) return;

    const score = answers.reduce((acc, answer, idx) => {
      return acc + (answer === selectedLesson.quiz_data[idx].correct_answer ? 1 : 0);
    }, 0);

    const { error } = await supabase.from('custom_lesson_progress').insert({
      lesson_id: selectedLesson.id,
      child_id: childId,
      quiz_score: score,
      quiz_total: selectedLesson.quiz_data.length,
    });

    if (error) {
      console.error('Error saving progress:', error);
    }

    setShowResults(true);
    await loadProgress(lessons);
  }

  function abandonQuiz() {
    setShowQuiz(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
  }

  function handleAnswerSelect(answerIndex: number) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);

    setTimeout(() => {
      const newAnswers = [...answers, answerIndex];
      setAnswers(newAnswers);

      if (currentQuestion < (selectedLesson?.quiz_data.length || 0) - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        submitQuiz();
      }
    }, 1000);
  }

  function restartQuiz() {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
    setShowQuiz(true);
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

  if (showResults && selectedLesson) {
    const score = answers.reduce((acc, answer, idx) => {
      return acc + (answer === selectedLesson.quiz_data[idx].correct_answer ? 1 : 0);
    }, 0);
    const percentage = Math.round((score / selectedLesson.quiz_data.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              percentage >= 80 ? 'bg-green-100' : percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className="text-4xl font-black">{percentage}%</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz terminé !</h2>
            <p className="text-xl text-gray-600">
              Tu as obtenu {score} sur {selectedLesson.quiz_data.length}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {selectedLesson.quiz_data.map((q, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-2">
                  {answers[idx] === q.correct_answer ? (
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                  )}
                  <p className="font-semibold text-gray-800">{q.question}</p>
                </div>
                <div className="ml-8">
                  <p className="text-sm text-gray-600">
                    Ta réponse : {q.options[answers[idx]]}
                  </p>
                  {answers[idx] !== q.correct_answer && (
                    <p className="text-sm text-green-600 font-semibold">
                      Bonne réponse : {q.options[q.correct_answer]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={restartQuiz}
              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-3 rounded-xl font-semibold transition"
            >
              Recommencer le quiz
            </button>
            <button
              onClick={() => {
                setSelectedLesson(null);
                setShowResults(false);
                setShowQuiz(false);
                setAnswers([]);
                setCurrentQuestion(0);
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition"
            >
              Retour aux leçons
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showQuiz && selectedLesson) {
    const question = selectedLesson.quiz_data[currentQuestion];

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-violet-50 to-purple-50 z-50 overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Logo size={40} />

              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold text-white">
                  {selectedLesson.title}
                </h1>
                <p className="text-sm text-blue-100">{selectedLesson.subject}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                  <Zap size={20} className="text-yellow-300" />
                  <span className="font-bold text-white">
                    {currentQuestion}/{selectedLesson.quiz_data.length}
                  </span>
                </div>
                <button
                  onClick={abandonQuiz}
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl flex items-center justify-center transition"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-600">
                  Question {currentQuestion + 1} / {selectedLesson.quiz_data.length}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {question.difficulty === 'easy' ? 'Facile' : question.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                </span>
              </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestion + 1) / selectedLesson.quiz_data.length) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-8">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(idx)}
                disabled={selectedAnswer !== null}
                className={`w-full p-4 rounded-xl text-left font-semibold transition ${
                  selectedAnswer === null
                    ? 'bg-gray-100 hover:bg-violet-100 text-gray-800'
                    : selectedAnswer === idx
                    ? idx === question.correct_answer
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                    : idx === question.correct_answer
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
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
            Retour
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedLesson.title}</h1>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold">
                  {selectedLesson.subject}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  {selectedLesson.grade_level}
                </span>
              </div>
            </div>

            <div className="prose max-w-none mb-8">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                {selectedLesson.content}
              </div>
            </div>

            <button
              onClick={() => setShowQuiz(true)}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Commencer le quiz ({selectedLesson.quiz_data.length} questions)
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
          onClick={onClose}
          className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-6"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mes Cours Personnalisés</h1>
        <p className="text-gray-600 mb-8">
          Leçons créées spécialement pour toi par tes parents
        </p>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune leçon disponible</h3>
            <p className="text-gray-600">
              Tes parents n'ont pas encore créé de leçon pour toi
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLessons).map(([subject, subjectLessons]) => (
              <div key={subject}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{subject}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectLessons.map((lesson) => {
                    const progress = lessonProgress[lesson.id];
                    const hasScore = progress && progress.quiz_score !== undefined;
                    const percentage = hasScore ? Math.round((progress.quiz_score / progress.quiz_total) * 100) : 0;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 relative"
                      >
                        {hasScore && (
                          <div className="absolute top-4 right-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                              percentage >= 80 ? 'bg-green-100 text-green-700' :
                              percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {percentage}%
                            </div>
                          </div>
                        )}
                        <h3 className="font-bold text-gray-800 text-lg mb-2 pr-14">{lesson.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{lesson.grade_level}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-violet-600">{lesson.quiz_data.length} questions</span>
                          {hasScore && (
                            <span className="text-xs text-gray-500">
                              {progress.quiz_score}/{progress.quiz_total}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
