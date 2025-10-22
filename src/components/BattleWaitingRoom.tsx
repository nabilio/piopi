import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Sword, Clock, Check, XCircle } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';

type Participant = {
  child_id: string;
  status: 'pending' | 'accepted' | 'declined';
  full_name: string;
};

type Battle = {
  id: string;
  creator_id: string;
  opponent_id: string;
  status: string;
  difficulty: string;
  total_quizzes: number;
  battle_subjects: { subject_id: string; subject_name: string }[];
};

type BattleWaitingRoomProps = {
  battleId: string;
  onClose: () => void;
  onBattleStart: () => void;
};

export function BattleWaitingRoom({ battleId, onClose, onBattleStart }: BattleWaitingRoomProps) {
  const { user, profile } = useAuth();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [battleStarting, setBattleStarting] = useState(false);
  const [myStatus, setMyStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [childName, setChildName] = useState<string>('');

  // Convert difficulty text to number
  function getDifficultyNumber(difficultyText: string): number {
    const mapping: Record<string, number> = {
      'facile': 1,
      'moyen': 3,
      'difficile': 5,
      'easy': 1,
      'medium': 3,
      'hard': 5
    };
    return mapping[difficultyText.toLowerCase()] || 3;
  }

  useEffect(() => {
    loadBattle();
    loadChildName();

    const channel = supabase
      .channel(`battle_${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`
        },
        (payload) => {
          console.log('Battle updated:', payload);
          loadBattle();
          if (payload.new.status === 'active') {
            setTimeout(() => {
              onBattleStart();
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, onBattleStart]);

  async function loadChildName() {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profile.id)
      .single();

    if (!error && data) {
      const firstName = data.full_name.split(' ')[0];
      setChildName(firstName);
    }
  }

  const allAccepted = battle?.status === 'active';

  async function loadBattle() {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('id, creator_id, opponent_id, status, difficulty, total_quizzes')
        .eq('id', battleId)
        .single();

      if (error) throw error;
      if (data) {
        const { data: quizzesData } = await supabase
          .from('battle_quizzes')
          .select(`
            subject_id,
            subjects (name)
          `)
          .eq('battle_id', battleId);

        const battleSubjects = quizzesData?.map(q => ({
          subject_id: q.subject_id,
          subject_name: (q.subjects as any)?.name || 'Matière'
        })) || [];

        setBattle({
          ...data,
          battle_subjects: battleSubjects
        });

        const creatorData = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', data.creator_id)
          .single();

        const opponentData = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', data.opponent_id)
          .single();

        const { data: notificationsData } = await supabase
          .from('battle_notifications')
          .select('user_id, status')
          .eq('battle_id', battleId);

        const opponentNotification = notificationsData?.find(n => n.user_id === data.opponent_id);

        const parts: Participant[] = [
          {
            child_id: data.creator_id,
            status: 'accepted',
            full_name: creatorData.data?.username || creatorData.data?.full_name || 'Créateur'
          },
          {
            child_id: data.opponent_id,
            status: (opponentNotification?.status as any) || 'pending',
            full_name: opponentData.data?.username || opponentData.data?.full_name || 'Adversaire'
          }
        ];

        setParticipants(parts);

        const myParticipant = parts.find(p => p.child_id === profile?.id);
        if (myParticipant) {
          setMyStatus(myParticipant.status);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading battle:', error);
      setLoading(false);
    }
  }


  async function handleResponse(accept: boolean) {
    if (!profile || !battle) return;

    try {
      if (accept) {
        await supabase
          .from('battle_notifications')
          .update({ status: 'accepted' })
          .eq('battle_id', battleId)
          .eq('user_id', profile.id);

        setMyStatus('accepted');
        await loadBattle();
      } else {
        await supabase
          .from('battles')
          .update({ status: 'cancelled' })
          .eq('id', battleId);

        await supabase
          .from('battle_notifications')
          .update({ status: 'declined' })
          .eq('battle_id', battleId)
          .eq('user_id', profile.id);

        onClose();
      }
    } catch (error) {
      console.error('Error handling response:', error);
    }
  }

  async function startBattleAsync() {
    if (!profile || !battle) return;

    try {
      console.log('Starting battle in async mode for creator:', battleId);
      setBattleStarting(true);

      const isCreator = profile.id === battle.creator_id;

      if (isCreator) {
        await generateQuizzesAndActivate();
      } else {
        onBattleStart();
      }
    } catch (error) {
      console.error('Error starting async battle:', error);
      setBattleStarting(false);
    }
  }

  async function generateQuizzesAndActivate() {
    try {
      if (battle && battle.battle_subjects && Array.isArray(battle.battle_subjects)) {
        console.log('Generating quiz questions for battle subjects:', battle.battle_subjects);

        // Get creator's grade level
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('grade_level')
          .eq('id', battle.creator_id)
          .single();

        if (!creatorProfile) {
          console.error('Creator profile not found');
          return;
        }

        console.log('Creator grade level:', creatorProfile.grade_level);

        for (let i = 0; i < battle.battle_subjects.length; i++) {
          const subject = battle.battle_subjects[i];
          console.log(`Processing subject ${i + 1}:`, subject);

          const difficultyNumber = getDifficultyNumber(battle.difficulty);
          console.log(`Difficulty "${battle.difficulty}" converted to: ${difficultyNumber}`);

          // Try to get activity with difficulty filter first
          let { data: activities, error: activityError } = await supabase
            .from('activities')
            .select('id, content')
            .eq('subject_id', subject.subject_id)
            .eq('grade_level', creatorProfile.grade_level)
            .eq('difficulty', difficultyNumber)
            .eq('type', 'quiz')
            .not('content', 'is', null);

          console.log(`Activities found for subject ${subject.subject_id}, grade ${creatorProfile.grade_level}, difficulty ${difficultyNumber}:`, activities?.length, 'Error:', activityError);

          // If no activities found with difficulty filter, try without it
          if (!activities || activities.length === 0) {
            console.log(`Trying without difficulty filter for subject ${subject.subject_id}`);
            const result = await supabase
              .from('activities')
              .select('id, content')
              .eq('subject_id', subject.subject_id)
              .eq('grade_level', creatorProfile.grade_level)
              .eq('type', 'quiz')
              .not('content', 'is', null);

            activities = result.data;
            activityError = result.error;
            console.log(`Activities found without difficulty filter:`, activities?.length, 'Error:', activityError);
          }

          // If still no activities, try ALL grade levels
          if (!activities || activities.length === 0) {
            console.log(`Trying ALL grade levels for subject ${subject.subject_id}`);
            const result = await supabase
              .from('activities')
              .select('id, content')
              .eq('subject_id', subject.subject_id)
              .eq('type', 'quiz')
              .not('content', 'is', null);

            activities = result.data;
            activityError = result.error;
            console.log(`Activities found across all grades:`, activities?.length, 'Error:', activityError);
          }

          if (activities && activities.length > 0) {
            // Pick a random activity
            const activity = activities[Math.floor(Math.random() * activities.length)];

            // Insert battle quiz
            const { error: insertError } = await supabase
              .from('battle_quizzes')
              .insert({
                battle_id: battleId,
                subject_id: subject.subject_id,
                activity_id: activity.id,
                quiz_order: i + 1,
                quiz_data: activity.content
              });

            if (insertError) {
              console.error(`Error inserting quiz ${i + 1}:`, insertError);
            } else {
              console.log(`✓ Quiz ${i + 1} created for subject:`, subject.subject_name);
            }
          } else {
            console.warn(`No activities found for subject ${subject.subject_id}, grade ${creatorProfile.grade_level}`);
            alert(`Aucun quiz trouvé pour ${subject.subject_name} au niveau ${creatorProfile.grade_level}. Veuillez d'abord générer du contenu pour ce niveau dans le panneau Admin.`);
            setBattleStarting(false);
            return;
          }
        }

        console.log('All quizzes processed, updating battle status...');
      } else {
        console.error('Battle subjects not found or invalid:', battle?.battle_subjects);
        setBattleStarting(false);
        return;
      }

      // After generating quizzes, update battle status
      const { error } = await supabase
        .from('battles')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', battleId);

      if (error) {
        console.error('Error updating battle status:', error);
        setBattleStarting(false);
        return;
      }

      // Update notification status to accepted
      await supabase
        .from('battle_notifications')
        .update({ status: 'accepted' })
        .eq('battle_id', battleId)
        .eq('user_id', profile?.id);

      console.log('Battle status updated successfully');
      console.log('Calling onBattleStart in 1.5 seconds...');
      setTimeout(() => {
        console.log('NOW calling onBattleStart!');
        onBattleStart();
      }, 1500);
    } catch (error) {
      console.error('Exception generating quizzes:', error);
      setBattleStarting(false);
      alert('Erreur lors de la préparation du battle. Veuillez réessayer.');
    }
  }

  async function updateBattleStatus() {
    await generateQuizzesAndActivate();
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'accepted':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-orange-500 animate-pulse" />;
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'accepted':
        return 'Accepté';
      case 'declined':
        return 'Refusé';
      default:
        return 'En attente...';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onClose}
          className="mb-6 bg-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-50 transition font-semibold text-gray-700 flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          Retour
        </button>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                  <Sword className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">Salle d'attente</h1>
                  <p className="text-white/90 text-lg">Battle en préparation</p>
                  {childName && (
                    <p className="text-white/80 text-base mt-1">Joueur : {childName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
                  <p className="text-gray-500 text-lg">Chargement...</p>
                </div>
              ) : (
                <>
                  {battle && (
                    <div className="mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border-2 border-orange-200">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Détails du Battle</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-gray-500 text-sm mb-1">Matières</p>
                          <div className="flex flex-wrap gap-2">
                            {battle.battle_subjects && battle.battle_subjects.length > 0 ? (
                              battle.battle_subjects.map((subject, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-semibold">
                                  {subject.subject_name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">Quiz en préparation...</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-gray-500 text-sm mb-1">Nombre de quiz</p>
                          <p className="text-3xl font-bold text-orange-600">{battle.total_quizzes}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-gray-500 text-sm mb-1">Temps total</p>
                          <p className="text-3xl font-bold text-green-600">{battle.total_quizzes * 2} min</p>
                          <p className="text-xs text-gray-500 mt-1">2 min par quiz</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Participants</h2>
                    <div className="space-y-4">
                      {participants.map((participant) => (
                        <div
                          key={participant.child_id}
                          className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-200 hover:border-orange-300 transition shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <AvatarDisplay userId={participant.child_id} size="md" />
                            <span className="font-bold text-gray-900 text-xl">{participant.full_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusIcon(participant.status)}
                            <span className={`text-lg font-bold ${
                              participant.status === 'accepted' ? 'text-green-600' :
                              participant.status === 'declined' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {getStatusText(participant.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {myStatus === 'pending' && battle && profile?.id !== battle.creator_id && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-8 shadow-lg mb-6">
                      <h3 className="font-bold text-purple-900 text-2xl mb-4 text-center">Tu as été invité à ce battle!</h3>
                      <p className="text-purple-700 text-center mb-6">Acceptes-tu le défi?</p>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => handleResponse(true)}
                          className="flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition shadow-lg text-lg"
                        >
                          <Check size={24} />
                          Accepter
                        </button>
                        <button
                          onClick={() => handleResponse(false)}
                          className="flex items-center gap-2 px-8 py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg text-lg"
                        >
                          <XCircle size={24} />
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}

                  {allAccepted && !battleStarting ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 text-center shadow-lg">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-12 h-12 text-white" />
                      </div>
                      <p className="font-bold text-green-900 text-2xl mb-2">Tous les participants sont prêts!</p>
                      <p className="text-green-700 text-lg mb-4">Cliquez sur le bouton pour commencer le battle</p>

                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                        <p className="text-sm text-yellow-800 font-semibold mb-2">⏱️ Informations importantes:</p>
                        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                          <li>Vous avez <strong>30 minutes</strong> pour terminer tous les quiz</li>
                          <li>Si vous ne jouez pas dans les 30 min, vous perdrez par forfait</li>
                          <li>Une fois commencé, vous ne pouvez pas mettre en pause</li>
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          console.log('Starting battle from all accepted state');
                          setBattleStarting(true);
                          updateBattleStatus();
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg transform hover:scale-105 flex items-center gap-3 mx-auto"
                      >
                        <span>🎮</span>
                        Commencer le Battle!
                        <span>⚔️</span>
                      </button>
                    </div>
                  ) : allAccepted && battleStarting ? (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl p-8 text-center shadow-lg">
                      <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
                      <p className="font-bold text-orange-900 text-2xl mb-2">Démarrage du battle...</p>
                      <p className="text-orange-700 text-lg">Préparation des quiz en cours...</p>
                    </div>
                  ) : myStatus === 'accepted' ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 text-center shadow-lg">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-12 h-12 text-white" />
                      </div>
                      {battle && profile?.id === battle.creator_id ? (
                        participants.every(p => p.status === 'accepted') ? (
                          <>
                            <p className="font-bold text-green-900 text-2xl mb-2">Tous les participants sont prêts!</p>
                            <p className="text-green-700 text-lg mb-4">Cliquez sur le bouton pour commencer le battle</p>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                              <p className="text-sm text-yellow-800 font-semibold mb-2">⏱️ Informations importantes:</p>
                              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>Vous avez <strong>30 minutes</strong> pour terminer tous les quiz</li>
                                <li>Si vous ne jouez pas dans les 30 min, vous perdrez par forfait</li>
                                <li>Une fois commencé, vous ne pouvez pas mettre en pause</li>
                              </ul>
                            </div>

                            <button
                              onClick={() => {
                                console.log('Starting battle from creator accepted state');
                                setBattleStarting(true);
                                updateBattleStatus();
                              }}
                              disabled={battleStarting}
                              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg transform hover:scale-105 flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>🎮</span>
                              {battleStarting ? 'Préparation...' : 'Commencer le Battle!'}
                              <span>⚔️</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-green-900 text-2xl mb-2">En attente de ton adversaire</p>
                            <p className="text-green-700 text-lg mb-4">Tu peux commencer à jouer maintenant sans attendre !</p>

                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
                              <p className="text-sm text-blue-800 font-semibold mb-2">💡 Mode asynchrone</p>
                              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Ton adversaire a <strong>24h</strong> pour accepter l'invitation</li>
                                <li>S'il n'accepte pas, ton score sera considéré comme un quiz solo</li>
                                <li>S'il accepte, il aura <strong>30 min</strong> pour jouer</li>
                              </ul>
                            </div>

                            <button
                              onClick={() => startBattleAsync()}
                              disabled={battleStarting}
                              className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-xl hover:from-red-600 hover:to-orange-600 transition shadow-lg transform hover:scale-105 flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Sword size={24} />
                              {battleStarting ? 'Préparation...' : 'Commencer maintenant'}
                            </button>
                          </>
                        )
                      ) : (
                        participants.every(p => p.status === 'accepted') ? (
                          <>
                            <p className="font-bold text-green-900 text-2xl mb-2">Tous les participants sont prêts!</p>
                            <p className="text-green-700 text-lg mb-4">Cliquez sur le bouton pour commencer le battle</p>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                              <p className="text-sm text-yellow-800 font-semibold mb-2">⏱️ Informations importantes:</p>
                              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>Vous avez <strong>30 minutes</strong> pour terminer tous les quiz</li>
                                <li>Si vous ne jouez pas dans les 30 min, vous perdrez par forfait</li>
                                <li>Une fois commencé, vous ne pouvez pas mettre en pause</li>
                              </ul>
                            </div>

                            <button
                              onClick={() => {
                                console.log('Starting battle from invited player accepted state');
                                setBattleStarting(true);
                                updateBattleStatus();
                              }}
                              disabled={battleStarting}
                              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg transform hover:scale-105 flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>🎮</span>
                              {battleStarting ? 'Préparation...' : 'Commencer le Battle!'}
                              <span>⚔️</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-green-900 text-2xl mb-2">Accepté!</p>
                            <p className="text-green-700 text-lg mb-4">En attente que ton adversaire accepte l'invitation</p>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                              <p className="text-sm text-yellow-800 font-semibold mb-2">⏱️ Informations importantes:</p>
                              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>Ton adversaire a <strong>24h</strong> pour accepter l'invitation</li>
                                <li>Une fois qu'il accepte, il aura <strong>30 minutes</strong> pour jouer</li>
                                <li>S'il ne joue pas dans les 30 min, il perdra par forfait</li>
                              </ul>
                            </div>

                            <div className="flex gap-4 justify-center">
                              <button
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition shadow-lg flex items-center gap-2"
                              >
                                <X size={20} />
                                Retour
                              </button>
                            </div>
                          </>
                        )
                      )}
                    </div>
                  ) : myStatus === 'declined' ? (
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-2xl p-8 text-center shadow-lg">
                      <div className="w-20 h-20 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-12 h-12 text-white" />
                      </div>
                      <p className="font-bold text-gray-900 text-2xl mb-2">Tu as refusé ce battle</p>
                      <p className="text-gray-700 text-lg">Tu peux revenir à l'accueil</p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-2xl p-8 text-center shadow-lg">
                      <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-12 h-12 text-white animate-pulse" />
                      </div>
                      <p className="font-bold text-orange-900 text-2xl mb-2">En attente...</p>
                      <p className="text-orange-700 text-lg mb-4">En attente que ton adversaire accepte l'invitation</p>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-left inline-block">
                        <p className="text-sm text-blue-800">⏱️ Cette invitation expire dans <strong>24 heures</strong></p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
