import { Clock, Users, Sword, Trophy } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

type BattleSubject = {
  subject_id: string;
  subject_name: string;
  lesson_id: string;
  lesson_title: string;
};

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
  created_at: string;
  started_at: string | null;
  completed_at?: string | null;
  winner_id?: string | null;
  opponent_name: string;
  my_progress: number;
  opponent_progress: number;
  is_creator: boolean;
  invitation_expires_at?: string | null;
  battle_subjects?: BattleSubject[];
};

type BattlesTabsProps = {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  yourTurn: Battle[];
  waitingForOpponent: Battle[];
  notStarted: Battle[];
  completed: Battle[];
  currentChildId: string;
  onBattleSelect: (battleId: string) => void;
};

export function BattlesTabs({
  activeSubTab,
  onSubTabChange,
  yourTurn,
  waitingForOpponent,
  notStarted,
  completed,
  currentChildId,
  onBattleSelect
}: BattlesTabsProps) {
  const tabs = [
    { id: 'your-turn', label: 'À toi de jouer', count: yourTurn.length, color: 'red' },
    { id: 'waiting', label: 'En attente adversaire', count: waitingForOpponent.length, color: 'blue' },
    { id: 'not-started', label: 'Pas commencé', count: notStarted.length, color: 'yellow' },
    { id: 'completed', label: 'Terminés', count: completed.length, color: 'gray' }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'red':
          return 'bg-red-100 text-red-700 border-red-300';
        case 'blue':
          return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'yellow':
          return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'gray':
          return 'bg-gray-100 text-gray-700 border-gray-300';
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    }
    return 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';
  };

  const renderBattleCard = (battle: Battle, showProgress: boolean = true) => {
    const canPlay = () => {
      if (activeSubTab === 'completed') return false;
      return true;
    };

    const isClickable = canPlay();

    const timeRemaining = null;

    const getStatusColor = () => {
      if (activeSubTab === 'your-turn') return 'from-red-50 to-orange-50 border-red-300';
      if (activeSubTab === 'waiting') return 'from-blue-50 to-cyan-50 border-blue-200';
      if (activeSubTab === 'not-started') return 'from-yellow-50 to-amber-50 border-yellow-300';
      return 'bg-white border-gray-200';
    };

    const getStatusMessage = () => {
      if (activeSubTab === 'your-turn') {
        return <p className="text-xs text-red-600 font-semibold mt-1">Ton adversaire a terminé! À toi de jouer maintenant 🎯</p>;
      }
      if (activeSubTab === 'waiting') {
        return <p className="text-xs text-blue-600 font-semibold mt-1">✓ Tu as terminé! En attente que {battle.opponent_name} joue</p>;
      }
      if (activeSubTab === 'not-started') {
        return <p className="text-xs text-yellow-700 font-semibold mt-1">Battle accepté mais personne n'a encore commencé</p>;
      }
      if (activeSubTab === 'completed' && battle.winner_id) {
        const isWinner = battle.winner_id === currentChildId;
        return (
          <p className={`text-xs font-semibold mt-1 ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
            {isWinner ? '🏆 Victoire!' : '😔 Défaite'}
          </p>
        );
      }
      return null;
    };

    // Special rendering for completed battles
    if (activeSubTab === 'completed') {
      const isWinner = battle.winner_id === currentChildId;
      const subjectsText = battle.battle_subjects && battle.battle_subjects.length > 0
        ? battle.battle_subjects.map(s => s.subject_name).join(', ')
        : 'Matières variées';

      return (
        <div
          key={battle.id}
          className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm"
        >
          <div className="space-y-3">
            {/* Victory/Defeat banner */}
            <div className={`text-center py-3 rounded-lg ${
              isWinner ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <p className={`text-lg font-bold ${isWinner ? 'text-green-700' : 'text-red-700'}`}>
                {isWinner ? '🏆 Victoire' : '😔 Défaite'} contre {battle.opponent_name}
              </p>
            </div>

            {/* Battle info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Matières :</span>
                <span className="font-semibold text-gray-900">{subjectsText}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Difficulté :</span>
                <span className="font-semibold text-gray-900">{battle.difficulty}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Nombre de quiz :</span>
                <span className="font-semibold text-gray-900">{battle.total_quizzes}</span>
              </div>
            </div>

            {/* Score display */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Ton score</p>
                <p className={`text-2xl font-bold ${isWinner ? 'text-green-600' : 'text-gray-700'}`}>
                  {battle.is_creator ? battle.creator_score : battle.opponent_score}
                </p>
              </div>
              <div className="text-2xl text-gray-400">vs</div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">{battle.opponent_name}</p>
                <p className={`text-2xl font-bold ${!isWinner ? 'text-green-600' : 'text-gray-700'}`}>
                  {battle.is_creator ? battle.opponent_score : battle.creator_score}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Regular rendering for active battles
    return (
      <div
        key={battle.id}
        onClick={() => isClickable && onBattleSelect(battle.id)}
        className={`bg-gradient-to-r ${getStatusColor()} border-2 rounded-xl p-4 transition-all ${
          isClickable ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-75'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarDisplay
              userId={battle.is_creator ? battle.opponent_id : battle.creator_id}
              fallbackName={battle.opponent_name}
              size="sm"
            />
            <div>
              <p className="font-bold text-gray-900">{battle.opponent_name}</p>
              <p className="text-sm text-gray-600">
                {battle.total_quizzes} quiz • {battle.difficulty}
              </p>
              {getStatusMessage()}
            </div>
          </div>
          <div className="text-right">
            {activeSubTab === 'your-turn' && (
              <>
                <div className="text-sm text-gray-600">Progression</div>
                <div className="text-2xl font-bold text-red-600">
                  {battle.my_progress}/{battle.total_quizzes}
                </div>
              </>
            )}
            {activeSubTab === 'waiting' && (
              <>
                {timeRemaining ? (
                  <>
                    <div className="text-xs text-gray-600">Expiration</div>
                    <div className={`text-lg font-bold ${timeRemaining.color}`}>
                      {timeRemaining.text}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Avancement: {battle.opponent_progress}/{battle.total_quizzes}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-600">Son avancement</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {battle.opponent_progress}/{battle.total_quizzes}
                    </div>
                  </>
                )}
              </>
            )}
            {activeSubTab === 'not-started' && (
              <div className="text-center bg-yellow-100 px-4 py-2 rounded-lg">
                <Sword className="w-6 h-6 text-yellow-600 mx-auto" />
                <p className="text-xs text-yellow-800 font-semibold mt-1">Commencer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getCurrentBattles = () => {
    switch (activeSubTab) {
      case 'your-turn':
        return yourTurn;
      case 'waiting':
        return waitingForOpponent;
      case 'not-started':
        return notStarted;
      case 'completed':
        return completed;
      default:
        return [];
    }
  };

  const currentBattles = getCurrentBattles();

  const getEmptyMessage = () => {
    switch (activeSubTab) {
      case 'your-turn':
        return {
          icon: <Sword size={64} className="mx-auto text-gray-300 mb-4" />,
          title: 'Aucun battle en attente',
          message: 'Tous tes adversaires attendent que tu joues!'
        };
      case 'waiting':
        return {
          icon: <Clock size={64} className="mx-auto text-gray-300 mb-4" />,
          title: 'Tu n\'attends personne',
          message: 'Aucun adversaire ne doit jouer pour le moment'
        };
      case 'not-started':
        return {
          icon: <Users size={64} className="mx-auto text-gray-300 mb-4" />,
          title: 'Aucun battle accepté',
          message: 'Commence un battle ou attends qu\'on accepte ton invitation'
        };
      case 'completed':
        return {
          icon: <Trophy size={64} className="mx-auto text-gray-300 mb-4" />,
          title: 'Aucun battle terminé',
          message: 'Termine un battle pour voir ton historique ici'
        };
      default:
        return {
          icon: <Sword size={64} className="mx-auto text-gray-300 mb-4" />,
          title: 'Aucun battle',
          message: ''
        };
    }
  };

  const emptyState = getEmptyMessage();

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSubTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap border-2 transition-all ${getColorClasses(
              tab.color,
              activeSubTab === tab.id
            )}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white rounded-full text-xs font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {currentBattles.length === 0 ? (
          <div className="text-center py-12">
            {emptyState.icon}
            <p className="text-xl text-gray-600 font-semibold mb-2">{emptyState.title}</p>
            <p className="text-gray-500">{emptyState.message}</p>
          </div>
        ) : (
          currentBattles.map(battle => renderBattleCard(battle))
        )}
      </div>
    </div>
  );
}
