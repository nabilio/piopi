import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowRight, Trophy, X, Timer, Zap, BookOpen, Sparkles } from 'lucide-react';
import { supabase, Activity } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { ConfirmDialog } from './ConfirmDialog';
import { playSound } from '../lib/sounds';
import { Logo } from './Logo';

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type QuizContent = {
  questions: Question[];
};

type QuizPlayerProps = {
  activity: Activity;
  subjectName?: string;
  lessonName?: string;
  onComplete: () => void;
  onBack: () => void;
  onQuizStart?: () => void;
  timerPreference?: boolean | null;
  onTimerPreferenceSet?: (useTimer: boolean) => void;
  onContinueNext?: () => void;
};

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function shuffleQuestionsWithOptions(questions: Question[]): Question[] {
  // Shuffle questions AND shuffle options within each question
  const shuffledQuestions = shuffleArray(questions);
  return shuffledQuestions.map(q => {
    const shuffledOptions = shuffleArray(q.options.map((opt, idx) => ({ opt, idx })));
    const newCorrectAnswer = shuffledOptions.findIndex(item => item.idx === q.correctAnswer);
    return {
      ...q,
      options: shuffledOptions.map(item => item.opt),
      correctAnswer: newCorrectAnswer
    };
  });
}

export function QuizPlayer({ activity, subjectName, lessonName, onComplete, onBack, onQuizStart, timerPreference, onTimerPreferenceSet, onContinueNext }: QuizPlayerProps) {
  const { profile } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [showTimerChoice, setShowTimerChoice] = useState(timerPreference === null || timerPreference === undefined);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [useTimer, setUseTimer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [unlockedQuizTitle, setUnlockedQuizTitle] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [animatingPoints, setAnimatingPoints] = useState(0);
  const [showModeSelector, setShowModeSelector] = useState(false);


  const content = activity.content as QuizContent;
  const [questions, setQuestions] = useState(() => shuffleQuestionsWithOptions(content.questions || []));
  const currentQ = questions[currentQuestion];
  const timerDuration = activity.timer_duration || 300;
  const bonusMultiplier = activity.timer_bonus_multiplier || 1.5;

  function resetQuiz() {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswered(false);
    setQuizCompleted(false);
    setStartTime(Date.now());
    setShowTimerChoice(true);
    setUseTimer(false);
    setTimeRemaining(timerDuration);
    setTimerActive(false);
    setQuestions(shuffleQuestionsWithOptions(content.questions || []));
  }

  useEffect(() => {
    if (!currentQ) {
      setQuizCompleted(true);
    }
  }, [currentQ]);

  useEffect(() => {
    // Reset quiz state when activity changes
    const content = activity.content as QuizContent;
    setQuestions(shuffleQuestionsWithOptions(content.questions || []));
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswered(false);
    setQuizCompleted(false);
    setStartTime(Date.now());
    setTimeRemaining(activity.timer_duration || 300);
    setTimerActive(false);
    setShowPointsAnimation(false);
    setAnimatingPoints(0);

    // If timerPreference is already set, start quiz automatically
    if (timerPreference !== null && timerPreference !== undefined) {
      setShowTimerChoice(false);
      setUseTimer(timerPreference);
      if (timerPreference) {
        setTimeRemaining(activity.timer_duration || 300);
        setTimerActive(true);
      }
      onQuizStart?.();
    } else {
      setShowTimerChoice(true);
    }
  }, [activity.id]);

  useEffect(() => {
    loadAvatar();
    loadUserProgress();
  }, [profile]);

  async function loadAvatar() {
    if (!profile) return;

    const { data } = await supabase
      .from('avatars')
      .select('*')
      .eq('child_id', profile.id)
      .maybeSingle();

    setAvatar(data);
  }

  async function loadUserProgress() {
    if (!profile) return;

    const { data } = await supabase
      .from('progress')
      .select('score')
      .eq('child_id', profile.id)
      .eq('completed', true);

    const total = data?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    setTotalPoints(total);
  }

  useEffect(() => {
    if (timerActive && useTimer && timeRemaining > 0 && !answered) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 10 && prev > 1) {
            playSound('countdown');
          }
          if (prev <= 1) {
            setTimerActive(false);
            handleTimeOut();
            playSound('timer_warning');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerActive, useTimer, timeRemaining, answered]);

  async function handleTimeOut() {
    setTimerActive(false);
    await saveProgress();
    setQuizCompleted(true);
  }

  function startQuizWithTimer(withTimer: boolean) {
    setUseTimer(withTimer);
    setShowTimerChoice(false);
    if (withTimer) {
      setTimeRemaining(timerDuration);
      setTimerActive(true);
    }
    onTimerPreferenceSet?.(withTimer);
    onQuizStart?.();
  }

  useEffect(() => {
    if (timerPreference !== null && timerPreference !== undefined && !showTimerChoice) {
      setUseTimer(timerPreference);
      if (timerPreference) {
        setTimeRemaining(timerDuration);
        setTimerActive(true);
      }
      onQuizStart?.();
    }
  }, []);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleAnswer(answerIndex: number) {
    if (answered) return;

    setSelectedAnswer(answerIndex);
    setAnswered(true);
    setShowResult(true);

    const isCorrect = answerIndex === currentQ.correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }
  }

  async function handleNext() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setShowResult(false);
      playSound('complete');
    } else {
      await saveProgress();
      setQuizCompleted(true);
      playSound('perfect');
    }
  }

  async function saveProgress() {
    if (!profile) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.round((score / questions.length) * 100);
    let pointsEarned = Math.round((finalScore / 100) * activity.points);

    const finishedInTime = useTimer && timeRemaining > 0;
    if (finishedInTime) {
      pointsEarned = Math.round(pointsEarned * bonusMultiplier);
    }

    const passedQuiz = score >= 7;
    const isPerfectScore = score === questions.length;

    // Check for records
    const { data: existingRecord } = await supabase
      .from('quiz_records')
      .select('*')
      .eq('activity_id', activity.id)
      .eq('child_id', profile.id)
      .maybeSingle();

    let isNewBestTime = false;
    let isNewBestScore = false;

    if (useTimer && finishedInTime) {
      const timeTaken = timerDuration - timeRemaining;
      if (!existingRecord?.best_time || timeTaken < existingRecord.best_time) {
        isNewBestTime = true;
      }
    }

    if (!existingRecord?.best_score || finalScore > existingRecord.best_score) {
      isNewBestScore = true;
    }

    const { data: allActivities } = await supabase
      .from('activities')
      .select('id, title')
      .eq('chapter_id', activity.chapter_id)
      .order('difficulty');

    const quizIndex = allActivities?.findIndex(a => a.id === activity.id) ?? -1;
    const isTreasureQuiz = (quizIndex + 1) % 5 === 0;
    const nextQuiz = passedQuiz && quizIndex >= 0 && quizIndex < (allActivities?.length ?? 0) - 1
      ? allActivities?.[quizIndex + 1]
      : null;

    if (isTreasureQuiz && passedQuiz) {
      pointsEarned += 50;
    }

    setUnlockedQuizTitle(nextQuiz?.title || null);

    const { error: progressError } = await supabase.from('progress').insert({
      child_id: profile.id,
      activity_id: activity.id,
      completed: passedQuiz,
      score: pointsEarned,
      time_spent: timeSpent,
      used_timer: useTimer,
      finished_in_time: finishedInTime
    });

    if (progressError) {
      console.error('Error saving progress:', progressError);
    }

    const { error: quizProgError } = await supabase.from('quiz_progression')
      .upsert({
        user_id: profile.id,
        chapter_id: activity.chapter_id,
        activity_id: activity.id,
        quiz_number: 1,
        completed: passedQuiz,
        score: score,
        max_score: questions.length,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,activity_id'
      });

    if (quizProgError) {
      console.error('Error saving quiz progression:', quizProgError);
    }

    // Update or create quiz record
    if (useTimer && finishedInTime) {
      const timeTaken = timerDuration - timeRemaining;
      await supabase.from('quiz_records').upsert({
        activity_id: activity.id,
        child_id: profile.id,
        best_time: existingRecord?.best_time && existingRecord.best_time < timeTaken ? existingRecord.best_time : timeTaken,
        best_score: existingRecord?.best_score && existingRecord.best_score > finalScore ? existingRecord.best_score : finalScore,
        perfect_score_count: isPerfectScore ? (existingRecord?.perfect_score_count || 0) + 1 : (existingRecord?.perfect_score_count || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'activity_id,child_id'
      });
    } else {
      await supabase.from('quiz_records').upsert({
        activity_id: activity.id,
        child_id: profile.id,
        best_score: existingRecord?.best_score && existingRecord.best_score > finalScore ? existingRecord.best_score : finalScore,
        perfect_score_count: isPerfectScore ? (existingRecord?.perfect_score_count || 0) + 1 : (existingRecord?.perfect_score_count || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'activity_id,child_id'
      });
    }

    // Share to activity feed based on special achievements or good scores
    const isGoodScore = finalScore >= 80 && passedQuiz;
    const shouldShare = isPerfectScore || isNewBestTime || isNewBestScore || isTreasureQuiz || isGoodScore;
    if (shouldShare) {
      let message = '';
      let activityType = 'completed_quiz';

      if (isPerfectScore) {
        const perfectMessages = [
          'Score parfait ! 100% ! 🌟',
          'Bravo champion ! 10/10, c\'est exceptionnel ! 🏆',
          'Excellent travail ! Un sans-faute impressionnant ! 🎉',
          'Tu es un génie ! Score parfait ! 💯'
        ];
        message = perfectMessages[Math.floor(Math.random() * perfectMessages.length)];
      } else if (isNewBestTime) {
        message = `Nouveau record de temps sur "${activity.title}" ! ⏱️`;
        activityType = 'record_broken';
      } else if (isNewBestScore && finalScore < 100) {
        message = `Nouveau meilleur score sur "${activity.title}" : ${finalScore}% ! 📈`;
        activityType = 'record_broken';
      } else if (isTreasureQuiz && passedQuiz) {
        message = `A débloqué la surprise mystère de "${activity.title}" ! 🎁`;
        activityType = 'mystery_unlocked';
      } else if (isGoodScore) {
        message = `Excellent résultat sur "${activity.title}" : ${finalScore}% ! 🎯`;
        activityType = 'completed_quiz';
      }

      const { error: feedError } = await supabase.from('activity_feed').insert({
        user_id: profile.id,
        activity_type: activityType,
        content: {
          title: activity.title,
          score: finalScore,
          subject: activity.subject_id,
          usedTimer: useTimer,
          finishedInTime: finishedInTime,
          message: message,
          correctAnswers: score,
          totalQuestions: questions.length,
          isPerfectScore: isPerfectScore,
          isNewRecord: isNewBestTime || isNewBestScore,
          isMystery: isTreasureQuiz
        },
        points_earned: pointsEarned
      });

      if (feedError) {
        console.error('Error posting to activity feed:', feedError);
      }
    }
  }

  const getAvatarEmoji = (type: string) => {
    const avatars: { [key: string]: string } = {
      explorer: '🧑‍🚀',
      scientist: '🔬',
      artist: '🎨',
      athlete: '⚽',
      musician: '🎵',
      chef: '👨‍🍳',
    };
    return avatars[type] || '🧑‍🎓';
  };

  if (showTimerChoice && activity.has_timer !== false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-4 px-4 shadow-lg mb-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4 relative">
              {profile && (
                <div className="flex items-center gap-4">
                  <AvatarDisplay userId={profile.id} fallbackName={profile.full_name} size="lg" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                    <p className="text-sm text-white/80">{profile.grade_level}</p>
                  </div>
                </div>
              )}

              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-white">
                {subjectName && lessonName ? `${subjectName} - ${lessonName} - Quiz` : 'Quiz'}
              </h1>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Trophy size={20} className="text-yellow-300" />
                  <span className="font-bold text-white">{totalPoints} pts</span>
                </div>
                <button
                  onClick={onBack}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition backdrop-blur-sm text-white"
                  title="Retour"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-12 max-w-2xl w-full text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-6">Mode de jeu</h2>
          <p className="text-gray-600 mb-8">
            Choisis comment tu veux jouer ce quiz:
          </p>

          <div className="space-y-4">
            <button
              onClick={() => startQuizWithTimer(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl hover:from-orange-600 hover:to-red-600 transition shadow-lg"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <Timer size={32} />
                <Zap size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Mode Chrono</h3>
              <p className="text-sm opacity-90 mb-2">
                Termine le quiz en {Math.floor(timerDuration / 60)} minutes
              </p>
              <div className="bg-white/20 rounded-lg p-3 mt-3">
                <p className="text-lg font-bold">
                  Bonus: +{Math.round((bonusMultiplier - 1) * 100)}% de points !
                </p>
              </div>
            </button>

            <button
              onClick={() => startQuizWithTimer(false)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition shadow-lg"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <BookOpen size={32} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Mode Tranquille</h3>
              <p className="text-sm opacity-90">
                Prends ton temps, pas de limite
              </p>
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (!currentQ || quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    let pointsEarned = Math.round((percentage / 100) * activity.points);
    const finishedInTime = useTimer && timeRemaining > 0;
    const passedQuiz = score >= 7;
    const isPerfect = score === questions.length;
    const isGoodScore = score >= 7;
    const timedOut = useTimer && timeRemaining === 0;

    if (finishedInTime) {
      pointsEarned = Math.round(pointsEarned * bonusMultiplier);
    }

    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-8 lg:p-12 max-w-2xl w-full text-center">
          {profile && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AvatarDisplay userId={profile.id} fallbackName={profile.full_name} size="lg" />
                  <div>
                    <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                    <p className="text-white/90 text-base">Bravo!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-6 py-3 rounded-full backdrop-blur-sm">
                  <Trophy size={28} className="text-yellow-300" />
                  <span className="font-bold text-2xl">{totalPoints + pointsEarned}</span>
                </div>
              </div>
            </div>
          )}
          <Trophy className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-6 ${isPerfect ? 'text-yellow-500' : isGoodScore ? 'text-green-500' : passedQuiz ? 'text-blue-500' : 'text-gray-400'}`} />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4">
            {timedOut ? 'Temps écoulé !' : 'Quiz Terminé !'}
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-4">
            Score: {score}/{questions.length} ({percentage}%)
          </p>

          {timedOut && (
            <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-4 mb-4">
              <p className="text-xl font-bold text-orange-600 mb-2">
                ⏰ Le temps est écoulé !
              </p>
              <p className="text-sm text-gray-700">
                Tu as répondu à {currentQuestion} question{currentQuestion > 1 ? 's' : ''} sur {questions.length}
              </p>
              {score > 0 && (
                <p className="text-sm text-green-600 font-semibold mt-2">
                  Tu as obtenu {score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''} !
                </p>
              )}
            </div>
          )}

          {!timedOut && isPerfect && (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-4 mb-4">
              <p className="text-xl font-bold text-orange-600">
                🌟 Score parfait ! Tu es incroyable ! 🏆
              </p>
            </div>
          )}

          {!timedOut && !isPerfect && isGoodScore && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 mb-4">
              <p className="text-lg font-bold text-green-600">
                👏 Très bon score ! Continue comme ça !
              </p>
            </div>
          )}

          {!timedOut && !passedQuiz && (
            <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-2xl p-4 mb-4">
              <p className="text-lg font-bold text-red-600">
                ⚠️ Score insuffisant (minimum 7/{questions.length})
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Réessaye pour débloquer le quiz suivant !
              </p>
            </div>
          )}

          {finishedInTime && (
            <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="text-orange-600" size={24} />
                <p className="text-lg font-bold text-orange-600">
                  Bonus Chrono Activé!
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Tu as terminé dans les temps: +{Math.round((bonusMultiplier - 1) * 100)}% de points
              </p>
            </div>
          )}

          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-4">
            <p className="text-xl font-bold text-orange-600">
              +{pointsEarned} points gagnés !
            </p>
          </div>

          {passedQuiz && unlockedQuizTitle && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <p className="text-lg font-bold text-purple-600">
                  Nouveau quiz débloqué !
                </p>
                <span className="text-2xl">🎉</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {unlockedQuizTitle}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Continue ta progression !
              </p>
            </div>
          )}

          <div className="space-y-3">
            {timedOut && (
              <button
                onClick={resetQuiz}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-8 py-4 rounded-full hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center gap-2"
              >
                <ArrowRight size={24} />
                <span>Réessayer le quiz</span>
              </button>
            )}
            {!timedOut && !isPerfect && (
              <button
                onClick={resetQuiz}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-8 py-4 rounded-full hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
              >
                <ArrowRight size={24} />
                <span>Réessayer pour un meilleur score</span>
              </button>
            )}
            {!timedOut && passedQuiz && (
              <>
                <button
                  onClick={() => {
                    if (!onContinueNext) {
                      onComplete();
                      onBack();
                      return;
                    }

                    setShowPointsAnimation(true);
                    setAnimatingPoints(0);

                    const duration = 1500;
                    const steps = 40;
                    const increment = pointsEarned / steps;
                    let currentStep = 0;

                    const interval = setInterval(() => {
                      currentStep++;
                      setAnimatingPoints(Math.floor(increment * currentStep));

                      if (currentStep >= steps) {
                        clearInterval(interval);
                        setTimeout(() => {
                          setShowPointsAnimation(false);
                          onComplete();
                          onContinueNext();
                        }, 300);
                      }
                    }, duration / steps);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-8 py-4 rounded-full hover:from-green-600 hover:to-emerald-600 transition flex items-center justify-center gap-2"
                >
                  <ArrowRight size={24} />
                  <span>Continuer vers le quiz suivant</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                onComplete();
                onBack();
              }}
              className="w-full bg-gray-100 text-gray-700 font-semibold px-8 py-3 rounded-full hover:bg-gray-200 transition"
            >
              Retour à la leçon
            </button>
          </div>
        </div>
        </div>

        {showPointsAnimation && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <Trophy className="w-32 h-32 text-yellow-400 mx-auto opacity-30" />
                </div>
                <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8 relative z-10 drop-shadow-2xl" />
              </div>

              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-12 border-4 border-white shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Points ajoutés!</h2>
                <div className="text-7xl font-black text-white mb-4 animate-pulse drop-shadow-lg">
                  +{animatingPoints}
                </div>
                <p className="text-2xl text-white drop-shadow-md">
                  Nouveau total: {totalPoints + animatingPoints}
                </p>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-lg"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {showModeSelector && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl w-full text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Choisis ton mode de jeu</h2>
              <p className="text-gray-600 mb-8">
                Sélectionne le mode pour le prochain quiz:
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    onTimerPreferenceSet?.(true);
                    setShowModeSelector(false);
                    setShowPointsAnimation(true);
                    setAnimatingPoints(0);

                    const duration = 1500;
                    const steps = 40;
                    const increment = pointsEarned / steps;
                    let currentStep = 0;

                    const interval = setInterval(() => {
                      currentStep++;
                      setAnimatingPoints(Math.floor(increment * currentStep));

                      if (currentStep >= steps) {
                        clearInterval(interval);
                        setTimeout(() => {
                          setShowPointsAnimation(false);
                          onComplete();
                          onBack();
                        }, 300);
                      }
                    }, duration / steps);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl hover:from-orange-600 hover:to-red-600 transition shadow-lg"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Timer size={32} />
                    <Zap size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Mode Chrono</h3>
                  <p className="text-sm opacity-90 mb-2">
                    Termine le quiz en {Math.floor(timerDuration / 60)} minutes
                  </p>
                  <div className="bg-white/20 rounded-lg p-3 mt-3">
                    <p className="text-lg font-bold">
                      Bonus: +{Math.round((bonusMultiplier - 1) * 100)}% de points !
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onTimerPreferenceSet?.(false);
                    setShowModeSelector(false);
                    setShowPointsAnimation(true);
                    setAnimatingPoints(0);

                    const duration = 1500;
                    const steps = 40;
                    const increment = pointsEarned / steps;
                    let currentStep = 0;

                    const interval = setInterval(() => {
                      currentStep++;
                      setAnimatingPoints(Math.floor(increment * currentStep));

                      if (currentStep >= steps) {
                        clearInterval(interval);
                        setTimeout(() => {
                          setShowPointsAnimation(false);
                          onComplete();
                          onBack();
                        }, 300);
                      }
                    }, duration / steps);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition shadow-lg"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <BookOpen size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Mode Tranquille</h3>
                  <p className="text-sm opacity-90">
                    Prends ton temps, pas de limite
                  </p>
                </button>

                <button
                  onClick={() => setShowModeSelector(false)}
                  className="w-full bg-gray-100 text-gray-700 font-semibold px-8 py-3 rounded-full hover:bg-gray-200 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-cyan-50 flex flex-col">
      {profile && (
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-4 px-4 shadow-lg flex-shrink-0">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4 relative">
              <div className="flex items-center gap-2">
                <Logo size={40} className="flex-shrink-0" />
                <h1 className="text-xl font-bold text-white">PioPi</h1>
              </div>

              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-white">
                {subjectName && lessonName ? `${subjectName} - ${lessonName} - Quiz` : 'Quiz'}
              </h1>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Trophy size={20} className="text-yellow-300" />
                  <span className="font-bold text-white">{totalPoints} pts</span>
                </div>
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition backdrop-blur-sm text-white"
                  title="Terminer le quiz"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
        <div className="w-full max-w-3xl flex flex-col h-full max-h-[calc(100vh-120px)]">
          <div className="bg-white rounded-3xl shadow-2xl p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="text-base font-bold text-gray-700">
                Question {currentQuestion + 1}/{questions.length}
              </div>
              <div className="flex items-center gap-3">
                {useTimer && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm ${
                    timeRemaining < 60 ? 'bg-red-100 text-red-600' :
                    timeRemaining < 120 ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Timer size={16} />
                    {formatTime(timeRemaining)}
                  </div>
                )}
                <div className="text-base font-bold text-blue-600">
                  Score: {score}/{currentQuestion + (answered ? 1 : 0)}
                </div>
              </div>
            </div>

            <div className="mb-4 bg-gray-200 rounded-full h-2 flex-shrink-0">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center flex-shrink-0">
              {currentQ.question}
            </h3>

            <div className="flex-1 flex flex-col justify-center space-y-3 mb-4 overflow-y-auto">
              {currentQ.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQ.correctAnswer;
                const showCorrectAnswer = showResult && isCorrect;
                const showWrongAnswer = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      playSound('complete');
                      handleAnswer(index);
                    }}
                    disabled={answered}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left font-semibold text-base ${
                      showCorrectAnswer
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : showWrongAnswer
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : isSelected
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                    } ${answered ? 'cursor-default' : 'cursor-pointer'} flex-shrink-0`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showCorrectAnswer && <CheckCircle className="text-green-500" size={24} />}
                      {showWrongAnswer && <XCircle className="text-red-500" size={24} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {showResult && currentQ.explanation && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex-shrink-0 max-h-24 overflow-y-auto">
                <p className="font-bold text-blue-900 mb-1 text-sm">Explication:</p>
                <p className="text-gray-700 text-sm leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}

            <div className="flex-shrink-0">
              {answered && (
                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-6 py-4 rounded-full hover:from-blue-600 hover:to-cyan-600 transition text-lg shadow-lg"
                >
                  {currentQuestion < questions.length - 1 ? 'Question suivante' : 'Terminer le quiz'}
                  <ArrowRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Quitter le quiz ?"
        message="Es-tu sûr de vouloir quitter le quiz ? Ta progression ne sera pas sauvegardée."
        confirmText="Quitter"
        cancelText="Continuer"
        variant="warning"
        onConfirm={() => {
          setShowExitConfirm(false);
          onBack();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
