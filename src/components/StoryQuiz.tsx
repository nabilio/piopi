import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Trophy, Loader, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { Logo } from './Logo';
import { playSound } from '../lib/sounds';

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type Quiz = {
  id: string;
  story_id: string;
  questions: Question[];
};

type StoryQuizProps = {
  storyId: string;
  childId: string;
  childName: string;
  onClose: () => void;
  onComplete?: (score: number, total: number) => void;
};

export function StoryQuiz({ storyId, childId, childName, onClose, onComplete }: StoryQuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [storyTitle, setStoryTitle] = useState('');

  useEffect(() => {
    loadQuiz();
    loadStoryInfo();
  }, [storyId]);

  async function loadStoryInfo() {
    const { data, error } = await supabase
      .from('stories')
      .select('title')
      .eq('id', storyId)
      .single();

    if (!error && data) {
      setStoryTitle(data.title);
    }
  }

  async function loadQuiz() {
    setLoading(true);
    const { data, error } = await supabase
      .from('story_quiz')
      .select('*')
      .eq('story_id', storyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        await generateQuiz();
      } else {
        console.error('Error loading quiz:', error);
      }
    } else {
      setQuiz(data);
    }
    setLoading(false);
  }

  async function generateQuiz() {
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story-quiz`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storyId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const { quiz: newQuiz } = await response.json();
      setQuiz(newQuiz);
    } catch (err) {
      console.error('Error generating quiz:', err);
    } finally {
      setGenerating(false);
    }
  }

  function handleAnswerSelect(answerIndex: number) {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  }

  function handleNext() {
    if (selectedAnswer === null) return;

    const newAnswers = [...userAnswers, selectedAnswer];
    setUserAnswers(newAnswers);

    if (!showExplanation) {
      const isCorrect = selectedAnswer === quiz?.questions[currentQuestion].correctAnswer;
      playSound(isCorrect ? 'correct' : 'wrong');
      setShowExplanation(true);
      return;
    }

    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      completeQuiz(newAnswers);
    }
  }

  async function completeQuiz(answers: number[]) {
    if (!quiz) return;

    let correctCount = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setCompleted(true);

    if (correctCount === quiz.questions.length) {
      playSound('perfect');
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } else if (correctCount >= quiz.questions.length * 0.7) {
      playSound('complete');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    try {
      await supabase.from('story_attempts').insert({
        story_id: storyId,
        child_id: childId,
        score: correctCount,
        total_questions: quiz.questions.length,
        answers: answers
      });

      const firstName = childName.split(' ')[0];
      await supabase.from('activity_feed').insert({
        user_id: childId,
        type: 'story_quiz',
        content: `${firstName} a réussi le quiz de son histoire du jour avec ${correctCount}/${quiz.questions.length} !`,
        metadata: {
          story_id: storyId,
          score: correctCount,
          total: quiz.questions.length
        }
      });

      if (onComplete) {
        onComplete(correctCount, quiz.questions.length);
      }
    } catch (err) {
      console.error('Error saving quiz attempt:', err);
    }
  }

  if (loading || generating) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 text-center">
          <Loader className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
          <p className="text-xl font-bold text-gray-800">
            {generating ? 'Création du quiz...' : 'Chargement du quiz...'}
          </p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-xl font-bold text-gray-800 mb-4">
            Impossible de charger le quiz
          </p>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    const percentage = (score / quiz.questions.length) * 100;
    const isGoodScore = percentage >= 70;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-pink-600 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 text-center max-w-2xl w-full">
          <div className="mb-6">
            <Trophy
              size={80}
              className={`mx-auto ${isGoodScore ? 'text-yellow-500' : 'text-gray-400'}`}
            />
          </div>
          <h2 className="text-4xl font-black text-gray-800 mb-4">
            {isGoodScore ? 'Bravo !' : 'Bien joué !'}
          </h2>
          <p className="text-6xl font-black text-purple-600 mb-6">
            {score}/{quiz.questions.length}
          </p>
          <p className="text-xl text-gray-700 mb-8">
            {isGoodScore
              ? 'Tu as très bien compris l\'histoire !'
              : 'Continue comme ça, tu progresses !'}
          </p>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg px-8 py-4 rounded-xl hover:shadow-xl transition-all"
          >
            Terminer
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 z-50 overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg px-6 py-4 flex items-center justify-between relative flex-shrink-0">
        <div className="flex items-center gap-3">
          <Logo size={40} className="flex-shrink-0" />
          <h1 className="text-xl font-bold text-white">PioPi</h1>
        </div>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-white">
          {storyTitle} - Quiz
        </h1>

        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} className="text-white" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <p className="text-white/90 text-sm mb-2">
                Question {currentQuestion + 1} / {quiz.questions.length}
              </p>
              <div className="w-full h-2 bg-white/30 rounded-full">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-8">
                {question.question}
              </h3>

              <div className="space-y-4 mb-8">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    className={`w-full p-4 rounded-xl border-2 text-left font-semibold transition-all ${
                      selectedAnswer === index
                        ? showExplanation
                          ? index === question.correctAnswer
                            ? 'bg-green-100 border-green-500 text-green-800'
                            : 'bg-red-100 border-red-500 text-red-800'
                          : 'bg-purple-100 border-purple-500 text-purple-800'
                        : showExplanation && index === question.correctAnswer
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : 'bg-white border-gray-200 hover:border-purple-300 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-black">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span>{option}</span>
                      {showExplanation && index === question.correctAnswer && (
                        <Check size={24} className="ml-auto text-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {showExplanation && (
                <div
                  className={`p-4 rounded-xl mb-6 ${
                    isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-blue-50 border-2 border-blue-200'
                  }`}
                >
                  <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-blue-800'}`}>
                    {isCorrect ? '✅ Bonne réponse !' : '💡 Explication :'}
                  </p>
                  <p className="text-gray-700">{question.explanation}</p>
                </div>
              )}

              <button
                onClick={handleNext}
                disabled={selectedAnswer === null}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg py-4 rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showExplanation
                  ? currentQuestion < quiz.questions.length - 1
                    ? 'Question suivante'
                    : 'Voir mes résultats'
                  : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
