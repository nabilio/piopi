import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Sword, AlertCircle, CheckCircle, X } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';

type TimeInfo = {
  text: string;
  color: string;
  expired: boolean;
};

type BattleInvitationsTabsProps = {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  receivedPending: any[];
  receivedAccepted: any[];
  sentPending: any[];
  sentAccepted: any[];
  currentChildId: string;
  onBattleSelect: (battleId: string) => void;
  onDeclineInvitation: (battleId: string, notificationId: string) => void;
  getTimeRemaining: (createdAt: string, isPending: boolean) => TimeInfo;
  getActiveTimeRemaining: (startedAt: string) => TimeInfo;
};

export function BattleInvitationsTabs({
  activeSubTab,
  onSubTabChange,
  receivedPending,
  receivedAccepted,
  sentPending,
  sentAccepted,
  currentChildId,
  onBattleSelect,
  onDeclineInvitation,
  getTimeRemaining,
  getActiveTimeRemaining
}: BattleInvitationsTabsProps) {
  const [showAllReceivedPending, setShowAllReceivedPending] = useState(false);
  const [showAllReceivedAccepted, setShowAllReceivedAccepted] = useState(false);
  const [acceptingBattle, setAcceptingBattle] = useState<string | null>(null);

  async function handleAcceptInvitation(battleId: string, notificationId: string) {
    try {
      setAcceptingBattle(battleId);
      console.log('Accepting invitation:', { battleId, notificationId });

      const { error } = await supabase
        .from('battle_notifications')
        .update({ status: 'accepted' })
        .eq('id', notificationId);

      if (error) {
        console.error('Error accepting invitation:', error);
        setAcceptingBattle(null);
        return;
      }

      console.log('Invitation accepted, opening waiting room');
      await new Promise(resolve => setTimeout(resolve, 300));
      onBattleSelect(battleId);
    } catch (error) {
      console.error('Exception accepting invitation:', error);
      setAcceptingBattle(null);
    }
  }
  const [showAllSentPending, setShowAllSentPending] = useState(false);
  const [showAllSentAccepted, setShowAllSentAccepted] = useState(false);

  const displayedReceivedPending = showAllReceivedPending ? receivedPending : receivedPending.slice(0, 5);
  const displayedReceivedAccepted = showAllReceivedAccepted ? receivedAccepted : receivedAccepted.slice(0, 5);
  const displayedSentPending = showAllSentPending ? sentPending : sentPending.slice(0, 5);
  const displayedSentAccepted = showAllSentAccepted ? sentAccepted : sentAccepted.slice(0, 5);

  const tabs = [
    { id: 'received', label: 'Invitations reçues', count: receivedPending.length },
    { id: 'sent', label: 'Invitations envoyées', count: sentPending.length }
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSubTabChange(tab.id)}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition ${
              activeSubTab === tab.id
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeSubTab === 'received' && (
          <>
            {receivedPending.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-semibold">Aucune invitation en attente</p>
              </div>
            ) : (
              <>
                {receivedPending.length > 5 && (
                  <button
                    onClick={() => setShowAllReceivedPending(!showAllReceivedPending)}
                    className="w-full py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700 font-semibold rounded-xl transition border-2 border-blue-200"
                  >
                    {showAllReceivedPending ? 'Réduire la liste' : `Afficher tout (${receivedPending.length})`}
                  </button>
                )}
                {displayedReceivedPending.map((inv: any) => {
                const timeInfo = getTimeRemaining(inv.created_at, true);
                return (
                  <div key={inv.id} className="bg-white rounded-xl p-6 border-2 border-orange-200 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <AvatarDisplay userId={inv.from_user_id} fallbackName={inv.sender.full_name} size="md" />
                        <div>
                          <p className="font-bold text-gray-800">{inv.sender.full_name}</p>
                          <p className="text-sm text-gray-600">{inv.battle.total_quizzes} quiz • {inv.battle.difficulty}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 mb-4 ${timeInfo.color} font-semibold`}>
                      <Clock size={18} />
                      <span className="text-sm">{timeInfo.text}</span>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        ⏱️ Cette invitation expire dans <strong>24 heures</strong>. Accepte-la avant qu'elle soit annulée !
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAcceptInvitation(inv.battle_id, inv.id)}
                        disabled={acceptingBattle === inv.battle_id}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptingBattle === inv.battle_id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle size={20} />
                        )}
                        {acceptingBattle === inv.battle_id ? 'Acceptation...' : 'Accepter'}
                      </button>
                      <button
                        onClick={() => {
                          console.log('Decline button clicked:', { battleId: inv.battle_id, notificationId: inv.id });
                          onDeclineInvitation(inv.battle_id, inv.id);
                        }}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-2"
                      >
                        <X size={20} />
                        Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
            )}
          </>
        )}

        {activeSubTab === 'sent' && (
          <>
            {sentPending.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Sword size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-semibold">Aucune invitation envoyée en attente</p>
              </div>
            ) : (
              <>
                {sentPending.length > 5 && (
                  <button
                    onClick={() => setShowAllSentPending(!showAllSentPending)}
                    className="w-full py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700 font-semibold rounded-xl transition border-2 border-blue-200"
                  >
                    {showAllSentPending ? 'Réduire la liste' : `Afficher tout (${sentPending.length})`}
                  </button>
                )}
                {displayedSentPending.map((battle: any) => {
                const timeInfo = getTimeRemaining(battle.created_at, true);
                const youHavePlayed = battle.creator_progress > 0;

                return (
                  <div key={battle.id} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <AvatarDisplay
                          userId={battle.opponent_id}
                          fallbackName={(battle.opponent as any)?.username || (battle.opponent as any)?.full_name || 'Adversaire'}
                          size="md"
                        />
                        <div>
                          <p className="font-bold text-gray-800">
                            {(battle.opponent as any)?.username || (battle.opponent as any)?.full_name || 'Adversaire'}
                          </p>
                          <p className="text-sm text-gray-600">{battle.total_quizzes} quiz • {battle.difficulty}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                        EN ATTENTE
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 mb-3 ${timeInfo.color} font-semibold`}>
                      <Clock size={18} />
                      <span className="text-sm">{timeInfo.text}</span>
                    </div>

                    {youHavePlayed ? (
                      <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
                        <p className="text-sm text-green-800 font-semibold">
                          ✅ Tu as terminé ton score ! En attente que {(battle.opponent as any)?.username || (battle.opponent as any)?.full_name || 'ton adversaire'} accepte l'invitation.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                          <p className="text-sm text-blue-800">
                            💡 <strong>Mode asynchrone :</strong> Tu peux jouer maintenant sans attendre ! Ton adversaire aura 24h pour accepter.
                          </p>
                        </div>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                          <p className="text-sm text-yellow-800">
                            ⏱️ Si l'invitation n'est pas acceptée sous <strong>24 heures</strong>, ton score sera considéré comme un quiz solo.
                          </p>
                        </div>
                        <button
                          onClick={() => onBattleSelect(battle.id)}
                          className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-orange-600 transition shadow-lg flex items-center justify-center gap-2"
                        >
                          <Sword size={20} />
                          Commencer maintenant
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
