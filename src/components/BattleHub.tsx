import { useState, useEffect } from 'react';
import { Sword, Swords, Trophy, Clock, Users, History, Plus, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { BattleSetup } from './BattleSetup';
import { BattleInvitationsTabs } from './BattleInvitationsTabs';
import { BattlesTabs } from './BattlesTabs';

type BattleInvitation = {
  id: string;
  battle_id: string;
  from_user_id: string;
  status: string;
  created_at: string;
  sender: {
    full_name: string;
  };
  battle: {
    difficulty: string;
    total_quizzes: number;
    creator_id: string;
    creator_score: number;
    opponent_score: number;
  };
};

type BattleHistory = {
  id: string;
  creator_id: string;
  opponent_id: string;
  status: string;
  difficulty: string;
  total_quizzes: number;
  creator_score: number;
  opponent_score: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  winner_id: string | null;
  opponent_name?: string;
  participants: { child_id: string; status: string }[];
};

type BattleHubProps = {
  onClose: () => void;
  onBattleSelect: (battleId: string) => void;
  childId?: string;
};

export function BattleHub({ onClose, onBattleSelect, childId }: BattleHubProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invitations' | 'battles' | 'history' | 'create'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('received');
  const [battleSubTab, setBattleSubTab] = useState<string>('your-turn');
  const [invitations, setInvitations] = useState<BattleInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0 });
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState<string>('');
  const [importantNotifications, setImportantNotifications] = useState<any[]>([]);

  const currentChildId = childId || profile?.id;

  useEffect(() => {
    if (currentChildId) {
      loadData();
      loadChildName();
    }
  }, [currentChildId, activeTab]);

  async function loadChildName() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', currentChildId)
      .single();

    if (!error && data) {
      const firstName = data.full_name.split(' ')[0];
      setChildName(firstName);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([
        loadInvitations(),
        loadSentInvitations(),
        loadActiveBattles(),
        loadHistory(),
        loadStats(),
        loadImportantNotifications()
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvitations() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('battle_notifications')
      .select(`
        id,
        battle_id,
        from_user_id,
        status,
        created_at,
        sender:profiles!battle_notifications_from_user_id_fkey(full_name),
        battle:battles!battle_notifications_battle_id_fkey(difficulty, total_quizzes, creator_id, opponent_id, creator_score, opponent_score, creator_progress, opponent_progress, status, created_at, started_at)
      `)
      .eq('user_id', currentChildId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('Invitations query result:', { data, error });

    if (!error && data) {
      const now = new Date().getTime();
      const expiredBattleIds: string[] = [];

      const validInvitations = data.filter(inv => {
        const battle = inv.battle as any;
        if (!battle) return true;

        if (battle.status === 'pending') {
          const createdAt = new Date(battle.created_at).getTime();
          const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

          if (hoursPassed >= 24) {
            expiredBattleIds.push(inv.battle_id);
            return false;
          }
        } else if (battle.status === 'active') {
          const startedAt = battle.started_at ? new Date(battle.started_at).getTime() : now;
          const minutesPassed = (now - startedAt) / (1000 * 60);

          if (minutesPassed >= 30) {
            expiredBattleIds.push(inv.battle_id);
            return false;
          }
        }
        return true;
      });

      if (expiredBattleIds.length > 0) {
        await supabase
          .from('battles')
          .update({ status: 'cancelled' })
          .in('id', expiredBattleIds);

        await supabase
          .from('battle_notifications')
          .update({ status: 'declined' })
          .in('battle_id', expiredBattleIds);
      }

      setInvitations(validInvitations as any);
    } else if (error) {
      console.error('Error loading invitations:', error);
    }
  }

  async function loadSentInvitations() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('battles')
      .select(`
        id,
        creator_id,
        opponent_id,
        status,
        difficulty,
        total_quizzes,
        creator_score,
        opponent_score,
        creator_progress,
        opponent_progress,
        created_at,
        started_at,
        opponent:profiles!battles_opponent_id_fkey(full_name, username),
        notification:battle_notifications!battle_notifications_battle_id_fkey(status)
      `)
      .eq('creator_id', currentChildId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const now = new Date().getTime();
      const expiredBattleIds: string[] = [];

      const validInvitations = data.filter(battle => {
        const notification = Array.isArray(battle.notification) ? battle.notification[0] : battle.notification;

        if (notification && notification.status !== 'pending') {
          return false;
        }

        const createdAt = new Date(battle.created_at).getTime();
        const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

        if (hoursPassed >= 24) {
          expiredBattleIds.push(battle.id);
          return false;
        }

        return true;
      });

      if (expiredBattleIds.length > 0) {
        await supabase
          .from('battles')
          .update({ status: 'cancelled' })
          .in('id', expiredBattleIds);

        await supabase
          .from('battle_notifications')
          .update({ status: 'declined' })
          .in('battle_id', expiredBattleIds);
      }

      setSentInvitations(validInvitations as any);
    } else if (error) {
      console.error('Error loading sent invitations:', error);
    }
  }

  async function loadActiveBattles() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('battles')
      .select(`
        id,
        creator_id,
        opponent_id,
        status,
        difficulty,
        total_quizzes,
        creator_score,
        opponent_score,
        creator_progress,
        opponent_progress,
        created_at,
        started_at,
        battle_subjects,
        creator:profiles!battles_creator_id_fkey(username, full_name),
        opponent:profiles!battles_opponent_id_fkey(username, full_name),
        notification:battle_notifications!battle_notifications_battle_id_fkey(status)
      `)
      .or(`creator_id.eq.${currentChildId},opponent_id.eq.${currentChildId}`)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      const filteredBattles = data.filter(b => {
        if (b.status === 'active') return true;

        const notification = Array.isArray(b.notification) ? b.notification[0] : b.notification;
        return notification && notification.status === 'accepted';
      });

      setActiveBattles(filteredBattles.map(b => {
        const isCreator = b.creator_id === currentChildId;
        const opponentData: any = isCreator ? b.opponent : b.creator;
        const opponentName = opponentData?.username || opponentData?.full_name || 'Adversaire';
        const myProgress = isCreator ? b.creator_progress : b.opponent_progress;
        const opponentProgress = isCreator ? b.opponent_progress : b.creator_progress;

        return {
          ...b,
          opponent_name: opponentName,
          my_progress: myProgress,
          opponent_progress: opponentProgress,
          is_creator: isCreator
        };
      }));
    } else if (error) {
      console.error('Error loading active battles:', error);
    }
  }

  async function loadHistory() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('battles')
      .select(`
        id,
        creator_id,
        opponent_id,
        status,
        difficulty,
        total_quizzes,
        creator_score,
        opponent_score,
        created_at,
        started_at,
        completed_at,
        winner_id,
        battle_subjects,
        creator:profiles!battles_creator_id_fkey(username, full_name),
        opponent:profiles!battles_opponent_id_fkey(username, full_name)
      `)
      .or(`creator_id.eq.${currentChildId},opponent_id.eq.${currentChildId}`)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(20);

    console.log('History query result:', { data, error, currentChildId });

    if (!error && data) {
      setHistory(data.map(b => {
        const isCreator = b.creator_id === currentChildId;
        const opponentData: any = isCreator ? b.opponent : b.creator;
        const opponentName = opponentData?.username || opponentData?.full_name || 'Adversaire';

        return {
          ...b,
          opponent_name: opponentName,
          participants: []
        };
      }));
    } else if (error) {
      console.error('Error loading history:', error);
    }
  }

  async function loadStats() {
    if (!currentChildId) return;

    const { data, error } = await supabase
      .from('battles')
      .select('id, winner_id, creator_id, opponent_id')
      .or(`creator_id.eq.${currentChildId},opponent_id.eq.${currentChildId}`)
      .eq('status', 'completed');

    console.log('Stats query result:', { data, error });

    if (!error && data) {
      const total = data.length;
      const wins = data.filter(b => b.winner_id === currentChildId).length;
      setStats({ total, wins, losses: total - wins });
    } else if (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadImportantNotifications() {
    if (!currentChildId) return;

    const notifications: any[] = [];

    const { data: battles, error } = await supabase
      .from('battles')
      .select(`
        id,
        creator_id,
        opponent_id,
        status,
        difficulty,
        total_quizzes,
        creator_score,
        opponent_score,
        creator_progress,
        opponent_progress,
        winner_id,
        started_at,
        created_at,
        opponent:profiles!battles_opponent_id_fkey(full_name, username),
        creator:profiles!battles_creator_id_fkey(full_name, username)
      `)
      .or(`creator_id.eq.${currentChildId},opponent_id.eq.${currentChildId}`)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (!error && battles) {
      const now = new Date().getTime();

      battles.forEach((battle: any) => {
        const isCreator = battle.creator_id === currentChildId;
        const myProgress = isCreator ? battle.creator_progress : battle.opponent_progress;
        const opponentProgress = isCreator ? battle.opponent_progress : battle.creator_progress;
        const opponentName = isCreator
          ? (battle.opponent?.username || battle.opponent?.full_name || 'Adversaire')
          : (battle.creator?.username || battle.creator?.full_name || 'Adversaire');

        if (battle.status === 'active') {
          const startedAt = battle.started_at ? new Date(battle.started_at).getTime() : null;
          const timeElapsed = startedAt ? (now - startedAt) / (1000 * 60) : 0;
          const minutesLeft = Math.max(0, 30 - timeElapsed);

          if (opponentProgress === battle.total_quizzes && myProgress < battle.total_quizzes) {
            const hours = Math.floor(minutesLeft / 60);
            const mins = Math.floor(minutesLeft % 60);
            notifications.push({
              id: battle.id,
              type: 'your_turn',
              title: 'À toi de jouer!',
              message: `${opponentName} a terminé. C'est ton tour!`,
              time: `${hours}h ${mins}min restantes`,
              timeColor: minutesLeft < 10 ? 'text-red-600' : 'text-yellow-600',
              battleId: battle.id,
              priority: 1
            });
          } else if (myProgress === battle.total_quizzes && opponentProgress < battle.total_quizzes) {
            const hours = Math.floor(minutesLeft / 60);
            const mins = Math.floor(minutesLeft % 60);
            notifications.push({
              id: battle.id,
              type: 'waiting',
              title: 'En attente',
              message: `En attente que ${opponentName} joue...`,
              time: `${hours}h ${mins}min restantes`,
              timeColor: minutesLeft < 10 ? 'text-red-600' : 'text-yellow-600',
              battleId: battle.id,
              priority: 2
            });
          }
        } else if (battle.status === 'completed') {
          const completedRecently = battle.created_at && (now - new Date(battle.created_at).getTime()) < (24 * 60 * 60 * 1000);

          if (completedRecently) {
            const iWon = battle.winner_id === currentChildId;
            const bothFinished = myProgress === battle.total_quizzes && opponentProgress === battle.total_quizzes;

            if (iWon && !bothFinished) {
              notifications.push({
                id: battle.id,
                type: 'won_forfeit',
                title: 'Victoire par forfait!',
                message: `${opponentName} a abandonné. Tu gagnes!`,
                battleId: battle.id,
                priority: 3
              });
            } else if (!iWon && !bothFinished && myProgress < battle.total_quizzes) {
              notifications.push({
                id: battle.id,
                type: 'lost_forfeit',
                title: 'Défaite par forfait',
                message: `Tu as abandonné contre ${opponentName}`,
                battleId: battle.id,
                priority: 4
              });
            }
          }
        }
      });
    }

    const { data: pendingInvitations } = await supabase
      .from('battle_notifications')
      .select(`
        id,
        battle_id,
        from_user_id,
        created_at,
        sender:profiles!battle_notifications_from_user_id_fkey(full_name, username)
      `)
      .eq('to_user_id', currentChildId)
      .eq('status', 'pending');

    if (pendingInvitations && pendingInvitations.length > 0) {
      pendingInvitations.forEach((inv: any) => {
        const senderName = inv.sender?.username || inv.sender?.full_name || 'Un joueur';
        notifications.push({
          id: inv.id,
          type: 'invitation',
          title: 'Nouvelle invitation!',
          message: `${senderName} t'invite à un battle`,
          battleId: inv.battle_id,
          priority: 0
        });
      });
    }

    notifications.sort((a, b) => a.priority - b.priority);
    setImportantNotifications(notifications.slice(0, 5));
  }

  function getTimeRemaining(createdAt: string, isPending: boolean) {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const hoursLimit = isPending ? 24 : 0.5;
    const totalMinutes = hoursLimit * 60;
    const minutesElapsed = (now - created) / (1000 * 60);
    const minutesLeft = Math.max(0, totalMinutes - minutesElapsed);

    if (minutesLeft <= 0) {
      return { text: 'Expiré', color: 'text-red-600', expired: true };
    }

    const hours = Math.floor(minutesLeft / 60);
    const minutes = Math.floor(minutesLeft % 60);

    if (hours > 0) {
      return {
        text: `${hours}h ${minutes}min restantes`,
        color: hours < 6 ? 'text-orange-600' : 'text-green-600',
        expired: false
      };
    }

    return {
      text: `${minutes}min restantes`,
      color: minutes < 10 ? 'text-red-600' : 'text-orange-600',
      expired: false
    };
  }

  function getActiveTimeRemaining(startedAt: string) {
    const started = new Date(startedAt).getTime();
    const now = new Date().getTime();
    const minutesElapsed = (now - started) / (1000 * 60);
    const minutesLeft = Math.max(0, 30 - minutesElapsed);

    if (minutesLeft <= 0) {
      return { text: 'Temps écoulé', color: 'text-red-600', expired: true };
    }

    const minutes = Math.floor(minutesLeft);
    const seconds = Math.floor((minutesLeft - minutes) * 60);

    return {
      text: `${minutes}min ${seconds}s restantes`,
      color: minutes < 10 ? 'text-red-600' : 'text-orange-600',
      expired: false
    };
  }

  async function handleDeclineInvitation(battleId: string, notificationId: string) {
    try {
      console.log('Declining invitation:', { battleId, notificationId });

      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .update({ status: 'cancelled' })
        .eq('id', battleId)
        .select();

      console.log('Battle update result:', { battleData, battleError });

      const { data: notifData, error: notifError } = await supabase
        .from('battle_notifications')
        .update({ status: 'declined' })
        .eq('id', notificationId)
        .select();

      console.log('Notification update result:', { notifData, notifError });

      if (battleError || notifError) {
        console.error('Errors:', { battleError, notifError });
        return;
      }

      await loadData();
      console.log('Data reloaded after decline');
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  }

  if (activeTab === 'create') {
    return (
      <BattleSetup
        childId={childId}
        onClose={() => setActiveTab('overview')}
        onBattleCreated={(battleId) => {
          setActiveTab('overview');
          onBattleSelect(battleId);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pb-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-auto overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
          <div className="relative flex items-center justify-center mb-4">
            <button onClick={onClose} className="absolute left-0 hover:bg-white/20 rounded-full p-2 transition">
              <ArrowLeft size={24} />
            </button>
            <div className="text-center">
              <h2 className="text-3xl font-black flex items-center justify-center gap-3">
                <Sword size={32} />
                Mode Battle
              </h2>
              {childName && (
                <p className="text-white/90 text-lg font-semibold mt-1">
                  Joueur : {childName}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={() => setActiveTab('create')}
              className="bg-white hover:bg-gray-100 text-red-600 font-bold px-8 py-4 rounded-full transition shadow-lg flex items-center gap-3 text-lg"
            >
              <Plus size={24} />
              Lancer un Battle
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 backdrop-blur-sm rounded-xl p-5 text-center border-2 border-yellow-300/50 shadow-lg">
              <div className="bg-yellow-400/30 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <Trophy size={32} className="text-yellow-100" />
              </div>
              <p className="text-3xl font-black">{stats.wins}</p>
              <p className="text-sm font-bold">Victoires</p>
            </div>
            <div className="bg-gradient-to-br from-red-400/30 to-orange-400/30 backdrop-blur-sm rounded-xl p-5 text-center border-2 border-red-300/50 shadow-lg">
              <div className="bg-red-400/30 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <Swords size={32} className="text-red-100" />
              </div>
              <p className="text-3xl font-black">{stats.total}</p>
              <p className="text-sm font-bold">Battles</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-4 px-4 font-bold transition text-sm ${
              activeTab === 'overview'
                ? 'bg-white text-red-600 border-b-4 border-red-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 py-4 px-4 font-bold transition relative text-sm ${
              activeTab === 'invitations'
                ? 'bg-white text-red-600 border-b-4 border-red-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Invitations
            {invitations.filter(inv => inv.status === 'pending').length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {invitations.filter(inv => inv.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            className={`flex-1 py-4 px-4 font-bold transition relative text-sm ${
              activeTab === 'battles'
                ? 'bg-white text-red-600 border-b-4 border-red-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Battles
            {activeBattles.length > 0 && (
              <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {activeBattles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 px-4 font-bold transition text-sm ${
              activeTab === 'history'
                ? 'bg-white text-red-600 border-b-4 border-red-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Historique
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {importantNotifications.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Clock size={20} className="text-red-600" />
                        Notifications Battle
                      </h4>
                      {importantNotifications.map(notif => {
                        const isClickable = notif.type !== 'lost_forfeit';
                        return (
                        <div
                          key={notif.id}
                          onClick={() => isClickable && (notif.type === 'invitation' ? setActiveTab('invitations') : onBattleSelect(notif.battleId))}
                          className={`rounded-xl p-4 transition-all ${
                            isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default opacity-75'
                          } ${
                            notif.type === 'invitation' ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 animate-pulse' :
                            notif.type === 'your_turn' ? 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200' :
                            notif.type === 'waiting' ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200' :
                            notif.type === 'won_forfeit' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' :
                            notif.type === 'lost_forfeit' ? 'bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300' :
                            'bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-gray-800 mb-1">{notif.title}</p>
                              <p className="text-sm text-gray-600">{notif.message}</p>
                              {notif.time && (
                                <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${notif.timeColor}`}>
                                  <Clock size={14} />
                                  {notif.time}
                                </p>
                              )}
                            </div>
                            <Sword size={24} className={
                              notif.type === 'invitation' ? 'text-purple-500' :
                              notif.type === 'your_turn' ? 'text-red-500' :
                              notif.type === 'waiting' ? 'text-blue-500' :
                              notif.type === 'won_forfeit' ? 'text-green-500' :
                              notif.type === 'lost_forfeit' ? 'text-red-500' :
                              'text-gray-500'
                            } />
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}

                  {invitations.filter(inv => inv.status === 'pending').length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-orange-200">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Users size={20} className="text-orange-600" />
                        Invitations en attente
                      </h4>
                      <div className="space-y-3">
                        {invitations.filter(inv => inv.status === 'pending').slice(0, 3).map(inv => (
                          <div
                            key={inv.id}
                            onClick={() => onBattleSelect(inv.battle_id)}
                            className="bg-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all hover:shadow-md"
                          >
                            <div>
                              <p className="font-semibold text-gray-800">{inv.sender.full_name}</p>
                              <p className="text-sm text-gray-600">
                                {inv.battle.total_quizzes} quiz • {inv.battle.difficulty}
                              </p>
                            </div>
                            <Sword size={24} className="text-red-500" />
                          </div>
                        ))}
                      </div>
                      {invitations.filter(inv => inv.status === 'pending').length > 3 && (
                        <button
                          onClick={() => setActiveTab('invitations')}
                          className="text-red-600 font-semibold mt-4 hover:underline"
                        >
                          Voir toutes les invitations ({invitations.filter(inv => inv.status === 'pending').length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invitations' && (
                <BattleInvitationsTabs
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                  receivedPending={invitations.filter(inv => inv.status === 'pending')}
                  receivedAccepted={[]}
                  sentPending={sentInvitations.filter(b => b.status === 'pending')}
                  sentAccepted={[]}
                  currentChildId={currentChildId || ''}
                  onBattleSelect={onBattleSelect}
                  onDeclineInvitation={handleDeclineInvitation}
                  getTimeRemaining={getTimeRemaining}
                  getActiveTimeRemaining={getActiveTimeRemaining}
                />
              )}

              {activeTab === 'battles' && (
                <BattlesTabs
                  activeSubTab={battleSubTab}
                  onSubTabChange={setBattleSubTab}
                  yourTurn={activeBattles.filter(b => b.opponent_progress === b.total_quizzes && b.my_progress < b.total_quizzes)}
                  waitingForOpponent={activeBattles.filter(b => b.my_progress === b.total_quizzes && b.opponent_progress < b.total_quizzes)}
                  notStarted={activeBattles.filter(b => b.my_progress === 0 && b.opponent_progress === 0)}
                  completed={history.filter(h => h.status === 'completed')}
                  currentChildId={currentChildId || ''}
                  onBattleSelect={onBattleSelect}
                />
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-12">
                      <History size={64} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-xl text-gray-600 font-semibold mb-2">Aucun historique</p>
                      <p className="text-gray-500">Tu n'as pas encore participé à des battles</p>
                    </div>
                  ) : (
                    history.map(battle => {
                      const isCreator = battle.creator_id === currentChildId;
                      const myScore = isCreator ? battle.creator_score : battle.opponent_score;
                      const opponentScore = isCreator ? battle.opponent_score : battle.creator_score;
                      const opponentId = isCreator ? battle.opponent_id : battle.creator_id;

                      let statusBadge = '';
                      let statusColor = '';

                      if (battle.status === 'completed') {
                        if (battle.winner_id === currentChildId) {
                          statusBadge = 'Victoire';
                          statusColor = 'bg-green-100 text-green-700';
                        } else if (battle.winner_id === null) {
                          statusBadge = 'Match nul';
                          statusColor = 'bg-gray-100 text-gray-700';
                        } else {
                          statusBadge = 'Défaite';
                          statusColor = 'bg-red-100 text-red-700';
                        }
                      } else if (battle.status === 'active') {
                        statusBadge = 'En cours';
                        statusColor = 'bg-blue-100 text-blue-700';
                      } else if (battle.status === 'cancelled') {
                        const createdAt = new Date(battle.created_at).getTime();
                        const now = new Date().getTime();
                        const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

                        if (hoursPassed >= 24) {
                          statusBadge = 'Expiré';
                          statusColor = 'bg-orange-100 text-orange-700';
                        } else {
                          statusBadge = 'Annulé';
                          statusColor = 'bg-gray-100 text-gray-700';
                        }
                      } else if (battle.status === 'pending') {
                        statusBadge = 'Invitation envoyée';
                        statusColor = 'bg-yellow-100 text-yellow-700';
                      }

                      const isClickable = battle.status === 'active';

                      return (
                        <div
                          key={battle.id}
                          onClick={() => isClickable && onBattleSelect(battle.id)}
                          className={`bg-white rounded-xl p-6 border-2 transition ${
                            isClickable
                              ? 'border-gray-200 hover:border-red-300 cursor-pointer hover:shadow-lg'
                              : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4 flex-1">
                              <AvatarDisplay userId={opponentId} fallbackName="Adversaire" size="md" />
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">
                                  {battle.status === 'cancelled' && battle.opponent_name ?
                                    `${battle.opponent_name}` :
                                    battle.opponent_name || 'Adversaire'}
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}>
                                    {statusBadge}
                                  </span>
                                  <span className="text-sm text-gray-500">{battle.difficulty}</span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {battle.total_quizzes} quiz • {new Date(battle.created_at).toLocaleDateString('fr-FR')}
                                </p>
                                {battle.status === 'completed' && (
                                  <div className="mt-3">
                                    <p className="text-2xl font-bold">
                                      <span className={myScore > opponentScore ? 'text-green-600' : myScore < opponentScore ? 'text-red-600' : 'text-gray-600'}>
                                        {myScore}
                                      </span>
                                      <span className="text-gray-400 mx-2">-</span>
                                      <span className={opponentScore > myScore ? 'text-green-600' : opponentScore < myScore ? 'text-red-600' : 'text-gray-600'}>
                                        {opponentScore}
                                      </span>
                                    </p>
                                    {battle.winner_id === currentChildId && (
                                      <p className="text-sm text-green-600 font-semibold mt-1">🏆 Tu as gagné ce battle !</p>
                                    )}
                                    {battle.winner_id && battle.winner_id !== currentChildId && (
                                      <p className="text-sm text-red-600 font-semibold mt-1">Tu as perdu ce battle</p>
                                    )}
                                    {!battle.winner_id && myScore === opponentScore && (
                                      <p className="text-sm text-gray-600 font-semibold mt-1">Match nul</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {battle.status === 'active' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBattleSelect(battle.id);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg transition"
                              >
                                Continuer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
