import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, ChevronRight, Loader, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { playSound } from '../lib/sounds';

type Battle = {
  id: string;
  creator_id: string;
  opponent_id: string;
  difficulty: string;
  total_quizzes: number;
  creator_score: number;
  opponent_score: number;
  creator_progress: number;
  opponent_progress: number;
  status: string;
};

type BattleQuiz = {
  id: string;
  battle_id: string;
  subject_id: string;
  activity_id: string;
  quiz_order: number;
  quiz_data: any;
  creator_answers?: any;
  opponent_answers?: any;
};

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type BattleArenaProps = {
  battleId: string;
  onComplete: () => void;
  childId?: string;
};

export function BattleArena({ battleId, onComplete, childId }: BattleArenaProps) {
  const { user, profile } = useAuth();
  const currentUserId = childId || profile?.id || user?.id;
  const [battle, setBattle] = useState<Battle | null>(null);
  const [quizzes, setQuizzes] = useState<BattleQuiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(120);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const isCreator = currentUserId === battle?.creator_id;
  const myProgress = isCreator ? battle?.creator_progress : battle?.opponent_progress;
  const opponentProgress = isCreator ? battle?.opponent_progress : battle?.creator_progress;

  useEffect(() => {
    loadBattle();
    subscribeToBattle();
    playSound('battle_start');
  }, [battleId]);

  useEffect(() => {
    if (quizzes.length > 0 && currentQuizIndex < quizzes.length) {
      loadQuizQuestions();
    }
  }, [currentQuizIndex, quizzes]);

  useEffect(() => {
    if (battle && quizzes.length > 0) {
      setTotalTimeLeft(quizzes.length * 120);
    }
  }, [battle, quizzes]);

  useEffect(() => {
    if (quizTimeLeft > 0 && totalTimeLeft > 0) {
      const timer = setInterval(() => {
        setQuizTimeLeft(prev => Math.max(0, prev - 1));
        setTotalTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    } else if (quizTimeLeft === 0 && questions.length > 0) {
      handleNextQuestion();
    }
  }, [quizTimeLeft, totalTimeLeft, questions]);

  async function loadBattle() {
    try {
      console.log('Loading battle with ID:', battleId);
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      console.log('Battle data loaded:', battleData, 'Error:', battleError);

      if (battleData) {
        const currentIsCreator = currentUserId === battleData.creator_id;
        const currentProgress = currentIsCreator ? battleData.creator_progress : battleData.opponent_progress;

        if (currentProgress >= battleData.total_quizzes) {
          console.log('User has already completed this battle');
          onComplete();
          return;
        }

        if (battleData.status === 'completed' || battleData.status === 'cancelled') {
          console.log('Battle is already finished');
          onComplete();
          return;
        }

        setBattle(battleData);

        if (!battleData.started_at && battleData.status === 'pending') {
          await supabase
            .from('battles')
            .update({
              status: 'active',
              started_at: new Date().toISOString()
            })
            .eq('id', battleId);
        }

        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .eq('id', battleData.creator_id)
          .single();

        const { data: opponentData } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .eq('id', battleData.opponent_id)
          .single();

        setCreatorProfile(creatorData);
        setOpponentProfile(opponentData);
      }

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('battle_quizzes')
        .select('*')
        .eq('battle_id', battleId)
        .order('quiz_order');

      console.log('Quizzes data loaded:', quizzesData, 'Count:', quizzesData?.length, 'Error:', quizzesError);

      if (quizzesData) {
        setQuizzes(quizzesData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading battle:', error);
      setLoading(false);
    }
  }

  function subscribeToBattle() {
    const channel = supabase
      .channel(`battle-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`
        },
        (payload) => {
          setBattle(payload.new as Battle);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function loadQuizQuestions() {
    try {
      const currentQuiz = quizzes[currentQuizIndex];

      const { data: activity } = await supabase
        .from('activities')
        .select('content')
        .eq('id', currentQuiz.activity_id)
        .single();

      if (activity && activity.content) {
        setQuestions(activity.content.questions || []);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setQuizTimeLeft(120);
      }
    } catch (error) {
      console.error('Error loading quiz questions:', error);
    }
  }

  function handleAnswerSelect(answerIndex: number) {
    setSelectedAnswer(answerIndex);
    playSound('complete');
  }

  async function handleNextQuestion() {
    const answer = selectedAnswer !== null ? selectedAnswer : -1;
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      await completeQuiz(newAnswers);
    }
  }

  async function completeQuiz(finalAnswers: number[]) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const currentQuiz = quizzes[currentQuizIndex];
      let score = 0;

      finalAnswers.forEach((answer, index) => {
        if (answer === questions[index].correctAnswer) {
          score += 10;
        }
      });

      console.log('Quiz completed! Score for this quiz:', score);
      console.log('Final answers:', finalAnswers);
      console.log('Questions:', questions.map(q => q.correctAnswer));

      const updateField = isCreator ? 'creator_answers' : 'opponent_answers';
      const scoreField = isCreator ? 'creator_score' : 'opponent_score';
      const completedField = isCreator ? 'creator_completed_at' : 'opponent_completed_at';

      console.log('Updating battle_quizzes:', {
        quizId: currentQuiz.id,
        updateField,
        scoreField,
        score,
        isCreator
      });

      const { error: quizUpdateError } = await supabase
        .from('battle_quizzes')
        .update({
          [updateField]: finalAnswers,
          [scoreField]: score,
          [completedField]: new Date().toISOString()
        })
        .eq('id', currentQuiz.id);

      if (quizUpdateError) {
        console.error('Error updating battle_quizzes:', quizUpdateError);
      }

      // Récupérer le score ET la progression actuels depuis la base de données
      const { data: currentBattleData } = await supabase
        .from('battles')
        .select('creator_score, opponent_score, creator_progress, opponent_progress')
        .eq('id', battleId)
        .single();

      const currentProgress = isCreator
        ? (currentBattleData?.creator_progress || 0)
        : (currentBattleData?.opponent_progress || 0);
      const newProgress = currentProgress + 1;
      const currentTotalScore = isCreator
        ? (currentBattleData?.creator_score || 0)
        : (currentBattleData?.opponent_score || 0);
      const newTotalScore = currentTotalScore + score;

      console.log('Current progress from DB:', currentProgress);
      console.log('New progress:', newProgress);
      console.log('Current total score from DB:', currentTotalScore);
      console.log('New total score:', newTotalScore);
      console.log('Updating battles table:', {
        battleId,
        progressField: isCreator ? 'creator_progress' : 'opponent_progress',
        scoreField: isCreator ? 'creator_score' : 'opponent_score',
        currentProgress,
        newProgress,
        currentTotalScore,
        newTotalScore,
        isCreator
      });

      const { error: battleUpdateError } = await supabase
        .from('battles')
        .update({
          [isCreator ? 'creator_progress' : 'opponent_progress']: newProgress,
          [isCreator ? 'creator_score' : 'opponent_score']: newTotalScore
        })
        .eq('id', battleId);

      if (battleUpdateError) {
        console.error('Error updating battles:', battleUpdateError);
      }

      if (currentQuizIndex < quizzes.length - 1) {
        setCurrentQuizIndex(currentQuizIndex + 1);
      } else {
        await checkBattleCompletion();
      }
    } catch (error) {
      console.error('Error completing quiz:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function checkBattleCompletion() {
    const { data: updatedBattle } = await supabase
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (updatedBattle &&
        updatedBattle.creator_progress === updatedBattle.total_quizzes &&
        updatedBattle.opponent_progress === updatedBattle.total_quizzes) {

      const winnerId = updatedBattle.creator_score > updatedBattle.opponent_score
        ? updatedBattle.creator_id
        : updatedBattle.opponent_score > updatedBattle.creator_score
        ? updatedBattle.opponent_id
        : null;

      await supabase
        .from('battles')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: winnerId
        })
        .eq('id', battleId);
    }

    onComplete();
  }

  // Check for timeout after 5 minutes
  useEffect(() => {
    if (!battle) return;

    const checkTimeout = async () => {
      const { data: updatedBattle } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (!updatedBattle || updatedBattle.status === 'completed') return;

      const now = new Date().getTime();
      const startedAt = updatedBattle.started_at ? new Date(updatedBattle.started_at).getTime() : null;

      // If battle started more than 5 minutes ago
      if (startedAt && (now - startedAt) > 5 * 60 * 1000) {
        const creatorFinished = updatedBattle.creator_progress === updatedBattle.total_quizzes;
        const opponentFinished = updatedBattle.opponent_progress === updatedBattle.total_quizzes;

        // If one finished and the other didn't, give victory to the one who finished
        if (creatorFinished && !opponentFinished) {
          await supabase
            .from('battles')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              winner_id: updatedBattle.creator_id
            })
            .eq('id', battleId);
          onComplete();
        } else if (opponentFinished && !creatorFinished) {
          await supabase
            .from('battles')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              winner_id: updatedBattle.opponent_id
            })
            .eq('id', battleId);
          onComplete();
        }
      }
    };

    const interval = setInterval(checkTimeout, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [battle, battleId, onComplete]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl font-semibold">Chargement du battle...</p>
        </div>
      </div>
    );
  }

  if (!battle || quizzes.length === 0) {
    console.error('Battle Arena Error:', { battle, quizzesLength: quizzes.length, battleId });
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl font-semibold mb-4">Battle introuvable</p>
          <p className="text-sm opacity-80">Battle: {battle ? 'OK' : 'Manquant'}</p>
          <p className="text-sm opacity-80">Quizzes: {quizzes.length} trouvés</p>
          <p className="text-sm opacity-80 mt-2">Battle ID: {battleId}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((myProgress || 0) / battle.total_quizzes) * 100;
  const opponentProgressPercentage = ((opponentProgress || 0) / battle.total_quizzes) * 100;

  async function handleQuit() {
    if (!user || !battle) return;

    const isCreator = user.id === battle.creator_id;
    const myProgress = isCreator ? battle.creator_progress : battle.opponent_progress;
    const opponentProgress = isCreator ? battle.opponent_progress : battle.creator_progress;

    const now = new Date();
    const startedAt = battle.started_at ? new Date(battle.started_at) : null;
    const timeElapsed = startedAt ? (now.getTime() - startedAt.getTime()) / (1000 * 60) : 0;
    const timeExpired = timeElapsed >= 30;

    const opponentHasStartedPlaying = opponentProgress > 0;

    console.log('Abandoning battle - checking conditions:', {
      battleId,
      currentUserId: user.id,
      isCreator,
      myProgress,
      opponentProgress,
      opponentHasStartedPlaying,
      timeElapsed: timeElapsed.toFixed(1) + ' minutes',
      timeExpired,
      battleStatus: battle.status
    });

    let updateData: any = {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    };

    if (opponentHasStartedPlaying || timeExpired) {
      const winnerId = isCreator ? battle.opponent_id : battle.creator_id;
      updateData = {
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      };
      console.log('Opponent wins by forfeit - winner_id:', winnerId);
    } else {
      console.log('Battle cancelled - opponent had not started playing yet');
    }

    const { error } = await supabase
      .from('battles')
      .update(updateData)
      .eq('id', battleId);

    if (error) {
      console.error('Error updating battle on quit:', error);
      return;
    }

    console.log('Battle updated:', updateData);

    setTimeout(() => {
      onComplete();
    }, 500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 p-4 relative">
      <button
        onClick={() => setShowQuitDialog(true)}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition z-10"
      >
        <X size={24} />
      </button>

      {showQuitDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Abandonner le battle?</h3>
            <p className="text-gray-600 mb-6">
              Si tu quittes maintenant, tu perdras automatiquement par forfait et ton adversaire remportera la victoire.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitDialog(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
              >
                Continuer le battle
              </button>
              <button
                onClick={() => {
                  setShowQuitDialog(false);
                  handleQuit();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AvatarDisplay
                  userId={isCreator ? battle.creator_id : battle.opponent_id}
                  fallbackName={isCreator ? creatorProfile?.username : opponentProfile?.username}
                  size="md"
                />
                <div className="text-white">
                  <div className="font-bold">{isCreator ? (creatorProfile?.username || creatorProfile?.full_name) : (opponentProfile?.username || opponentProfile?.full_name)}</div>
                  <div className="text-sm opacity-90">Vous</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-white/80 text-sm mb-1">Temps total</div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                  <span className="text-2xl font-bold text-white">
                    {formatTime(totalTimeLeft)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-white text-right">
                  <div className="font-bold">{isCreator ? (opponentProfile?.username || opponentProfile?.full_name) : (creatorProfile?.username || creatorProfile?.full_name)}</div>
                  <div className="text-sm opacity-90">Adversaire</div>
                  {opponentProgress === 0 ? (
                    battle.status === 'pending' ? (
                      <div className="text-xs mt-1 bg-yellow-500/30 px-2 py-1 rounded-full">
                        N'a pas encore accepté (max 24h)
                      </div>
                    ) : (
                      <div className="text-xs mt-1 bg-red-500/30 px-2 py-1 rounded-full">
                        N'a pas encore commencé
                      </div>
                    )
                  ) : opponentProgress === battle.total_quizzes ? (
                    <div className="text-xs mt-1 bg-green-500/30 px-2 py-1 rounded-full">
                      ✓ Terminé
                    </div>
                  ) : (
                    <div className="text-xs mt-1 bg-blue-500/30 px-2 py-1 rounded-full">
                      En cours... ({opponentProgress}/{battle.total_quizzes})
                    </div>
                  )}
                </div>
                <AvatarDisplay
                  userId={isCreator ? battle.opponent_id : battle.creator_id}
                  fallbackName={isCreator ? opponentProfile?.username : creatorProfile?.username}
                  size="md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-white text-sm">
                <span>Quiz {(myProgress || 0) + 1} / {battle.total_quizzes}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-white text-sm mt-2">
                <span>{isCreator ? (opponentProfile?.username || opponentProfile?.full_name || 'Adversaire') : (creatorProfile?.username || creatorProfile?.full_name || 'Adversaire')}</span>
                <span>{Math.round(opponentProgressPercentage)}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-300 transition-all duration-500"
                  style={{ width: `${opponentProgressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {opponentProgress === battle.total_quizzes && (myProgress || 0) < battle.total_quizzes && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="font-bold text-green-900 text-lg">
                    {isCreator ? (opponentProfile?.username || opponentProfile?.full_name || 'Ton adversaire') : (creatorProfile?.username || creatorProfile?.full_name || 'Ton adversaire')} a terminé!
                  </p>
                  <p className="text-green-700 text-sm">
                    Il attend ton résultat pour déterminer le vainqueur. Fais de ton mieux! 💪
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentQuestion ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-500">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </span>
                <div className="flex items-center gap-2 text-red-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-xl font-bold">{formatTime(quizTimeLeft)}</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                {currentQuestion.question}
              </h3>

              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition ${
                      selectedAnswer === index
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{option}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null || submitting}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {currentQuestionIndex < questions.length - 1 ? 'Question suivante' :
                     currentQuizIndex < quizzes.length - 1 ? 'Quiz suivant' : 'Terminer'}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-red-500" />
              <p className="text-gray-600">Chargement des questions...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
