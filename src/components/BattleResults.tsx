import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Target, Clock, Share2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/sounds';
import { useToast } from '../hooks/useToast';

type Battle = {
  id: string;
  creator_id: string;
  opponent_id: string;
  status: string;
  difficulty: string;
  total_quizzes: number;
  creator_score: number;
  opponent_score: number;
  creator_progress: number;
  opponent_progress: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  invitation_expires_at?: string | null;
  creator_started_at?: string | null;
  opponent_started_at?: string | null;
};

type BattleResultsProps = {
  battleId: string;
  onClose: () => void;
  childId?: string;
};

export function BattleResults({ battleId, onClose, childId }: BattleResultsProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const currentUserId = childId || profile?.id || user?.id;
  const [battle, setBattle] = useState<Battle | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [quizDetails, setQuizDetails] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBattleResults();

    const refreshInterval = setInterval(() => {
      loadBattleResults();
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [battleId]);

  async function loadBattleResults() {
    try {
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select('id, creator_id, opponent_id, status, difficulty, total_quizzes, creator_score, opponent_score, creator_progress, opponent_progress, winner_id, created_at, started_at')
        .eq('id', battleId)
        .maybeSingle();

      console.log('Battle data:', battleData, 'Error:', battleError);
      console.log('Current user ID:', currentUserId, 'Auth UID:', (await supabase.auth.getUser()).data.user?.id);
      console.log('Battle ID:', battleId);

      if (battleError) {
        console.error('Error loading battle:', battleError);
        console.error('Error details:', {
          message: battleError.message,
          code: battleError.code,
          hint: battleError.hint,
          details: battleError.details
        });
        setLoading(false);
        return;
      }

      if (battleData) {
        setBattle(battleData);

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

        console.log('Creator:', creatorData, 'Opponent:', opponentData);

        setCreatorProfile(creatorData);
        setOpponentProfile(opponentData);

        const { data: quizzesData } = await supabase
          .from('battle_quizzes')
          .select(`
            *,
            subjects (name, icon)
          `)
          .eq('battle_id', battleId)
          .order('quiz_order');

        console.log('Quizzes data from DB:', quizzesData);

        if (quizzesData) {
          setQuizDetails(quizzesData);
        }

        const isCreatorCheck = currentUserId === battleData.creator_id;
        const myProgressCheck = isCreatorCheck ? battleData.creator_progress : battleData.opponent_progress;
        const iHaveFinishedCheck = myProgressCheck === battleData.total_quizzes;
        const opponentProgressCheck = isCreatorCheck ? battleData.opponent_progress : battleData.creator_progress;
        const opponentHasFinishedCheck = opponentProgressCheck === battleData.total_quizzes;
        const bothFinishedCheck = iHaveFinishedCheck && opponentHasFinishedCheck;

        if (battleData.winner_id === currentUserId && iHaveFinishedCheck && bothFinishedCheck) {
          playSound('battle_victory');
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }, 500);
        } else if (battleData.winner_id !== currentUserId && battleData.status === 'completed' && bothFinishedCheck) {
          playSound('battle_defeat');
        }
      }
    } catch (error) {
      console.error('Error loading battle results:', error);
    } finally {
      setLoading(false);
    }
  }

  async function shareResults() {
    if (!battle || sharing) return;

    setSharing(true);
    try {
      const isCreator = currentUserId === battle.creator_id;
      const myScore = isCreator ? battle.creator_score : battle.opponent_score;
      const opponentScore = isCreator ? battle.opponent_score : battle.creator_score;
      const opponentName = isCreator
        ? (opponentProfile?.username || opponentProfile?.full_name || 'Adversaire')
        : (creatorProfile?.username || creatorProfile?.full_name || 'Adversaire');

      const myProgress = isCreator ? battle.creator_progress : battle.opponent_progress;
      const opponentProgress = isCreator ? battle.opponent_progress : battle.creator_progress;
      const iHaveFinished = myProgress === battle.total_quizzes;
      const opponentHasFinished = opponentProgress === battle.total_quizzes;
      const bothFinished = iHaveFinished && opponentHasFinished;

      const isWinner = battle.winner_id === currentUserId;
      const isDraw = bothFinished && battle.winner_id === null && myScore === opponentScore;
      const waitingForOpponent = iHaveFinished && !opponentHasFinished;

      let message = '';
      let title = '';

      if (waitingForOpponent) {
        message = `J'ai terminé avec ${myScore} points! En attente que ${opponentName} joue...`;
        title = 'Battle en attente';
      } else if (isDraw) {
        message = `Match nul contre ${opponentName}! ${myScore} - ${opponentScore}`;
        title = 'Match nul!';
      } else if (isWinner) {
        message = `Victoire contre ${opponentName}! ${myScore} - ${opponentScore}`;
        title = 'Battle gagné!';
      } else {
        message = `Défaite contre ${opponentName}. ${myScore} - ${opponentScore}`;
        title = 'Battle terminé';
      }

      console.log('Sharing battle results:', { user_id: currentUserId, title, message });

      let activityType = 'battle_lost';
      if (waitingForOpponent) {
        activityType = 'battle_started';
      } else if (isDraw) {
        activityType = 'battle_draw';
      } else if (isWinner) {
        activityType = 'battle_won';
      } else {
        activityType = 'battle_lost';
      }

      const { data, error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: currentUserId,
          activity_type: activityType,
          content: {
            title: title,
            description: message,
            battle_id: battleId,
            opponent_id: isCreator ? battle.opponent_id : battle.creator_id,
            opponent_name: opponentName,
            my_score: myScore,
            opponent_score: opponentScore,
            is_winner: isWinner
          },
          points_earned: isWinner ? 10 : (isDraw ? 5 : 0)
        })
        .select();

      console.log('Share result:', { data, error });

      if (error) {
        console.error('Error inserting into activity_feed:', error);
        showToast('Erreur lors du partage: ' + error.message, 'error');
      } else {
        showToast('Résultats partagés dans le fil d\'actualité!', 'success');
      }
    } catch (error) {
      console.error('Error sharing results:', error);
      showToast('Erreur lors du partage', 'error');
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl font-semibold">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center p-4">
        <div className="text-center text-white bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md">
          <p className="text-xl font-semibold mb-2">Battle introuvable</p>
          <p className="text-sm text-white/80 mb-4">
            Ce battle n'est pas accessible ou a été supprimé. Vérifiez la console pour plus de détails.
          </p>
          <button
            onClick={onClose}
            className="bg-white text-red-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const isCreator = currentUserId === battle.creator_id;
  const myScore = isCreator ? battle.creator_score : battle.opponent_score;
  const opponentScore = isCreator ? battle.opponent_score : battle.creator_score;
  const myProgress = isCreator ? battle.creator_progress : battle.opponent_progress;
  const opponentProgress = isCreator ? battle.opponent_progress : battle.creator_progress;
  const myProfile = isCreator ? creatorProfile : opponentProfile;
  const opponentProfileData = isCreator ? opponentProfile : creatorProfile;

  const iHaveFinished = myProgress === battle.total_quizzes;
  const opponentHasFinished = opponentProgress === battle.total_quizzes;
  const bothFinished = iHaveFinished && opponentHasFinished;
  const isRealDraw = bothFinished && battle.winner_id === null && myScore === opponentScore;
  const waitingForOpponent = iHaveFinished && !opponentHasFinished && battle.status === 'active';

  const battleCancelled = battle.status === 'cancelled';
  const iHaveAbandoned = !iHaveFinished && battle.status === 'completed';
  const opponentAbandoned = !opponentHasFinished && iHaveFinished && battle.status === 'completed';

  const isWinner = battle.winner_id === currentUserId && !iHaveAbandoned && bothFinished && !battleCancelled;

  console.log('BattleResults display logic:', {
    isCreator,
    myScore,
    opponentScore,
    myProgress,
    opponentProgress,
    totalQuizzes: battle.total_quizzes,
    iHaveFinished: `${iHaveFinished} (${myProgress} === ${battle.total_quizzes})`,
    opponentHasFinished: `${opponentHasFinished} (${opponentProgress} === ${battle.total_quizzes})`,
    bothFinished,
    isRealDraw,
    waitingForOpponent,
    iHaveAbandoned,
    opponentAbandoned,
    winnerId: battle.winner_id,
    userId: currentUserId,
    isWinner,
    battleStatus: battle.status
  });

  let timeRemaining = '';
  let timeColor = 'text-gray-600';

  if (battle.status === 'pending') {
    timeRemaining = 'En attente de l\'adversaire';
    timeColor = 'text-yellow-600';
  } else if (battle.status === 'active') {
    if (battle.started_at) {
      const startedAt = new Date(battle.started_at).getTime();
      const now = new Date().getTime();
      const minutesElapsed = (now - startedAt) / (1000 * 60);
      const minutesLeft = Math.max(0, 30 - minutesElapsed);

      if (minutesLeft > 0) {
        const minutes = Math.floor(minutesLeft);
        const seconds = Math.floor((minutesLeft - minutes) * 60);
        timeRemaining = `Temps restant: ${minutes}min ${seconds}s`;
        timeColor = minutesLeft < 10 ? 'text-red-600' : 'text-yellow-600';
      } else {
        timeRemaining = 'Temps écoulé';
        timeColor = 'text-red-600';
      }
    } else {
      timeRemaining = 'Battle en cours';
      timeColor = 'text-green-600';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className={`p-8 text-center ${
            battleCancelled ? 'bg-gradient-to-r from-gray-500 to-gray-600' :
            isWinner ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
            isRealDraw ? 'bg-gradient-to-r from-blue-400 to-purple-400' :
            waitingForOpponent ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            iHaveAbandoned ? 'bg-gradient-to-r from-red-600 to-red-700' :
            !iHaveFinished && battle.status === 'active' ? 'bg-gradient-to-r from-orange-400 to-red-400' :
            'bg-gradient-to-r from-gray-600 to-gray-700'
          }`}>
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${
              isWinner ? 'text-yellow-600' : waitingForOpponent ? 'text-white' : 'text-white/60'
            }`} />
            <h2 className="text-4xl font-bold text-white mb-2">
              {battleCancelled ? 'Battle annulé' :
               isWinner ? 'Victoire!' :
               isRealDraw ? 'Match Nul!' :
               waitingForOpponent ? 'Bravo !' :
               iHaveAbandoned ? 'Défaite par abandon' :
               !iHaveFinished && battle.status === 'active' ? 'En cours...' :
               'Défaite'}
            </h2>
            <p className="text-white/90 text-lg">
              {battleCancelled ? `Le battle a été annulé. ${opponentProfileData?.username || opponentProfileData?.full_name || 'Ton adversaire'} n'avait pas encore commencé à jouer.` :
               isWinner ? 'Félicitations, vous avez gagné le battle!' :
               isRealDraw ? 'Égalité parfaite ! Vous êtes au même niveau !' :
               waitingForOpponent ? `Tu as terminé avec ${myScore} points ! En attente que ${opponentProfileData?.username || opponentProfileData?.full_name || 'ton adversaire'} joue pour connaître le vainqueur !` :
               iHaveAbandoned ? `Tu as abandonné le battle. ${opponentProfileData?.username || opponentProfileData?.full_name || 'Ton adversaire'} a gagné par forfait !` :
               !iHaveFinished && battle.status === 'active' ? `Tu as complété ${myProgress} quiz sur ${battle.total_quizzes}. Continue !` :
               'Continue à t\'entraîner!'}
            </p>
            {timeRemaining && (
              <div className={`mt-4 flex items-center justify-center gap-2 text-white font-semibold text-lg ${timeColor === 'text-red-600' ? 'text-red-200' : 'text-yellow-200'}`}>
                <Clock className="w-5 h-5" />
                {timeRemaining}
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <AvatarDisplay
                  userId={isCreator ? battle.creator_id : battle.opponent_id}
                  fallbackName={myProfile?.username}
                  size="lg"
                  className="mx-auto mb-3"
                />
                <div className="font-bold text-gray-900 text-lg">Vous</div>
                <div className="text-3xl font-bold text-red-600 mt-2">{myScore}</div>
                <div className="text-sm text-gray-500">points</div>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-6xl font-bold text-gray-300">VS</div>
              </div>

              <div className="text-center">
                <AvatarDisplay
                  userId={isCreator ? battle.opponent_id : battle.creator_id}
                  fallbackName={opponentProfileData?.username}
                  size="lg"
                  className="mx-auto mb-3"
                />
                <div className="font-bold text-gray-900 text-lg">{opponentProfileData?.username || opponentProfileData?.full_name || 'Adversaire'}</div>
                <div className="text-3xl font-bold text-orange-600 mt-2">{opponentScore}</div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Détails du Battle
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Quiz complétés</div>
                  <div className="text-2xl font-bold text-gray-900">{battle.total_quizzes}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Difficulté</div>
                  <div className="text-2xl font-bold text-gray-900 capitalize">{battle.difficulty}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-gray-700 text-sm mb-2">Score par quiz:</div>
                {quizDetails.map((quiz, index) => (
                  <div key={quiz.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          Quiz {index + 1}: {quiz.subjects?.name || 'Matière'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-red-600">
                        {isCreator ? quiz.creator_score : quiz.opponent_score}
                      </span>
                      <span className="text-gray-400">-</span>
                      <span className="font-bold text-orange-600">
                        {isCreator ? quiz.opponent_score : quiz.creator_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={shareResults}
                disabled={sharing}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {sharing ? 'Partage...' : 'Partager'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
