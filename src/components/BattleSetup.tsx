import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Sword, Users, BookOpen, Check, Calculator, Landmark, Languages, FlaskConical, Compass, HeartHandshake, Microscope } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';

type Friend = {
  id: string;
  username: string;
  avatar_url?: string;
  hasPendingInvitation?: boolean;
};

type Subject = {
  id: string;
  name: string;
  icon: string;
};

type SelectedSubject = {
  subject_id: string;
  subject_name: string;
};

type BattleSetupProps = {
  onClose: () => void;
  onBattleCreated: (battleId: string) => void;
  childId?: string;
};

export function BattleSetup({ onClose, onBattleCreated, childId }: BattleSetupProps) {
  const { user, profile } = useAuth();
  const activeUserId = childId || profile?.id || user?.id;
  const [step, setStep] = useState<'friend' | 'subjects' | 'recap'>('friend');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checkedSubjects, setCheckedSubjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);

  function getIconComponent(iconName: string) {
    const iconMap: Record<string, any> = {
      'book-open': BookOpen,
      'calculator': Calculator,
      'landmark': Landmark,
      'languages': Languages,
      'flask-conical': FlaskConical,
      'compass': Compass,
      'heart-handshake': HeartHandshake,
      'microscope': Microscope,
    };
    const IconComponent = iconMap[iconName] || BookOpen;
    return <IconComponent className="w-5 h-5 text-red-500" />;
  }

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (step === 'subjects') {
      loadSubjectsForGradeLevel();
    }
  }, [step]);

  async function loadFriends() {
    try {
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .eq('status', 'accepted')
        .or(`user_id.eq.${activeUserId},friend_id.eq.${activeUserId}`);

      if (friendshipsError) {
        console.error('Error loading friendships:', friendshipsError);
        return;
      }

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f =>
          f.user_id === activeUserId ? f.friend_id : f.user_id
        );

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, role')
          .in('id', friendIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
          return;
        }

        // Charger les invitations en attente pour chaque ami
        const { data: pendingBattles } = await supabase
          .from('battles')
          .select('challenger_id, opponent_id')
          .eq('challenger_id', activeUserId)
          .eq('status', 'pending');

        const pendingOpponentIds = new Set(
          (pendingBattles || []).map(b => b.opponent_id)
        );

        if (profiles && profiles.length > 0) {
          const friendsList = profiles
            .filter(p => p.role === 'child')
            .map(p => ({
              id: p.id,
              username: p.username || p.full_name || 'Ami',
              hasPendingInvitation: pendingOpponentIds.has(p.id)
            }));

          setFriends(friendsList);
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  }

  async function loadSubjectsForGradeLevel() {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('grade_level')
        .eq('id', activeUserId)
        .single();

      if (!profileData?.grade_level) {
        console.error('No grade_level found for user');
        return;
      }

      console.log('Loading subjects for grade level:', profileData.grade_level);

      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, icon, grade_levels')
        .order('name');

      console.log('All subjects:', { data, error });

      if (data) {
        const filteredSubjects = data.filter(subject => {
          const levels = subject.grade_levels as string[];
          return levels && levels.includes(profileData.grade_level);
        });
        console.log('Filtered subjects for', profileData.grade_level, ':', filteredSubjects);
        setSubjects(filteredSubjects);
        return;
      }

      if (error) {
        console.error('Error loading subjects:', error);
        return;
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }

  function toggleSubject(subjectId: string) {
    const newChecked = new Set(checkedSubjects);
    if (newChecked.has(subjectId)) {
      newChecked.delete(subjectId);
    } else {
      // Limiter à 3 matières maximum
      if (newChecked.size >= 3) {
        alert('Tu ne peux sélectionner que 3 matières maximum!');
        return;
      }
      newChecked.add(subjectId);
    }
    setCheckedSubjects(newChecked);
  }

  function canProceedToRecap(): boolean {
    return checkedSubjects.size > 0;
  }

  function getSelectedBattleSubjects(): SelectedSubject[] {
    const result: SelectedSubject[] = [];
    for (const subjectId of checkedSubjects) {
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        result.push({
          subject_id: subjectId,
          subject_name: subject.name
        });
      }
    }
    return result;
  }

  async function createBattle() {
    if (!selectedFriend) return;

    // Vérifier si une invitation est déjà en attente
    const selectedFriendData = friends.find(f => f.id === selectedFriend);
    if (selectedFriendData?.hasPendingInvitation) {
      alert('Vous avez déjà une invitation en attente avec cet ami. Attendez sa réponse avant d\'envoyer une nouvelle invitation.');
      return;
    }

    setLoading(true);
    try {
      const battleSubjects = getSelectedBattleSubjects();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-battle`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator_id: activeUserId,
          opponent_id: selectedFriend,
          battle_subjects: battleSubjects,
          difficulty: 'moyen'
        })
      });

      const result = await response.json();
      console.log('Battle creation response:', result);

      if (!response.ok) {
        console.error('Battle creation failed:', result);
        throw new Error(result.error || 'Failed to create battle');
      }

      onBattleCreated(result.battle_id);
    } catch (error) {
      console.error('Error creating battle:', error);
      alert(`Erreur lors de la création du battle: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function selectFriend(friendId: string, friendName: string) {
    setSelectedFriend(friendId);
    setSelectedFriendName(friendName);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sword className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Mode Battle</h2>
              <p className="text-white/80 text-sm">Défiez un ami!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-2 rounded-full ${step === 'friend' ? 'bg-red-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step === 'subjects' ? 'bg-red-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step === 'recap' ? 'bg-red-500' : 'bg-gray-200'}`} />
          </div>

          {step === 'friend' && (
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-500" />
                  Choisir un adversaire
                </h3>
                <p className="text-sm text-gray-600">
                  Sélectionne un seul ami à défier
                </p>
              </div>

              {loadingFriends ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Vous n'avez pas encore d'amis. Ajoutez des amis pour lancer un battle!
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div key={friend.id} className="relative">
                      <button
                        onClick={() => !friend.hasPendingInvitation && selectFriend(friend.id, friend.username)}
                        disabled={friend.hasPendingInvitation}
                        className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          friend.hasPendingInvitation
                            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                            : selectedFriend === friend.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <AvatarDisplay userId={friend.id} size="sm" />
                        <div className="flex-1 text-left">
                          <span className="font-medium text-gray-900">{friend.username}</span>
                          {friend.hasPendingInvitation && (
                            <p className="text-xs text-orange-600 font-semibold mt-1">
                              Invitation déjà envoyée
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep('subjects')}
                disabled={!selectedFriend}
                className="w-full mt-6 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 'subjects' && (
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-red-500" />
                  Sélectionner les matières
                </h3>
                <p className="text-sm text-gray-600">
                  Choisis entre 1 et 3 matières maximum pour ce battle
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${(checkedSubjects.size / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {checkedSubjects.size}/3
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className={`border-2 rounded-xl p-4 transition ${
                    !checkedSubjects.has(subject.id) && checkedSubjects.size >= 3
                      ? 'border-gray-200 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-red-300'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkedSubjects.has(subject.id)}
                        onChange={() => toggleSubject(subject.id)}
                        disabled={!checkedSubjects.has(subject.id) && checkedSubjects.size >= 3}
                        className="w-5 h-5 text-red-500 rounded focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center gap-2">
                        {getIconComponent(subject.icon)}
                        <span className="font-semibold text-gray-900 text-lg">
                          {subject.name}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('friend')}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep('recap')}
                  disabled={!canProceedToRecap()}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 'recap' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Récapitulatif
              </h3>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 mb-6 border-2 border-red-200">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Adversaire</p>
                    <div className="flex items-center gap-3">
                      <AvatarDisplay userId={selectedFriend!} size="sm" />
                      <p className="font-bold text-gray-900 text-lg">{selectedFriendName}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Matières sélectionnées</p>
                    <div className="space-y-2">
                      {getSelectedBattleSubjects().map((item, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            {getIconComponent(subjects.find(s => s.id === item.subject_id)?.icon || 'book-open')}
                          </div>
                          <p className="font-semibold text-gray-900">{item.subject_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-red-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{checkedSubjects.size}</span> matière{checkedSubjects.size > 1 ? 's' : ''} sélectionnée{checkedSubjects.size > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('subjects')}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Retour
                </button>
                <button
                  onClick={createBattle}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi de l\'invitation...' : 'Inviter!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
