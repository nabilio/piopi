import { useEffect, useMemo, useState } from 'react';
import { CalendarHeart, Cake, Gift, PartyPopper, Sparkles, Users } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function formatBirthday(dateString: string | null) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!month || !day) return null;
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' });
  return formatter.format(new Date(Date.UTC(year || 2000, month - 1, day)));
}

function getNextBirthday(dateString: string | null) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!month || !day) return null;

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let next = new Date(Date.UTC(today.getFullYear(), month - 1, day));

  if (next < todayUtc) {
    next = new Date(Date.UTC(today.getFullYear() + 1, month - 1, day));
  }

  const diffTime = next.getTime() - todayUtc.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return { date: next, daysUntil };
}

type FriendBirthday = Profile & {
  daysUntil: number | null;
  nextBirthday: Date | null;
  hasWished: boolean;
};

type BirthdayCardProps = {
  currentChildId: string | null;
  onManageFriends?: () => void;
};

const MESSAGE_TEMPLATES = [
  'Joyeux anniversaire ! 🎉',
  'Une journée magique rien que pour toi ! ✨',
  'Que tes rêves se réalisent aujourd\'hui ! 🌟',
  'Pleins de surprises et de sourires ! 😊'
];

const VIRTUAL_GIFTS = [
  '🎁 Coffre surprise',
  '🪄 Baguette magique',
  '🐉 Dragon protecteur en peluche',
  '🍰 Gâteau arc-en-ciel',
  '🎈 Nuage de ballons'
];

export function BirthdayCard({ currentChildId, onManageFriends }: BirthdayCardProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [childBirthday, setChildBirthday] = useState<string | null>(null);
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState('');
  const [updatingBirthday, setUpdatingBirthday] = useState(false);
  const [friendsWithBirthdays, setFriendsWithBirthdays] = useState<FriendBirthday[]>([]);
  const [friendsWithoutBirthday, setFriendsWithoutBirthday] = useState<Profile[]>([]);
  const [wishSelections, setWishSelections] = useState<Record<string, { message: string; gift: string }>>({});
  const [sendingWishId, setSendingWishId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!currentChildId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadBirthdayData(currentChildId);
  }, [currentChildId]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const nextBirthdayLabel = useMemo(() => formatBirthday(childBirthday), [childBirthday]);

  async function loadBirthdayData(childId: string) {
    try {
      const [{ data: childData, error: childError }, sentFriendshipsResult, receivedFriendshipsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, birthday')
          .eq('id', childId)
          .maybeSingle(),
        supabase
          .from('friendships')
          .select(`
            id,
            friend:profiles!friendships_friend_id_fkey(id, full_name, avatar_url, birthday)
          `)
          .eq('user_id', childId)
          .eq('status', 'accepted'),
        supabase
          .from('friendships')
          .select(`
            id,
            sender:profiles!friendships_user_id_fkey(id, full_name, avatar_url, birthday)
          `)
          .eq('friend_id', childId)
          .eq('status', 'accepted')
      ]);

      if (childError) throw childError;

      if (childData) {
        setChildBirthday(childData.birthday ?? null);
      } else {
        setChildBirthday(null);
      }

      const sentFriendships = sentFriendshipsResult.data || [];
      const receivedFriendships = receivedFriendshipsResult.data || [];

      const sentFriends = sentFriendships
        .map((friendship: any) => friendship.friend as Profile | null)
        .filter((friend): friend is Profile => Boolean(friend));
      const receivedFriends = receivedFriendships
        .map((friendship: any) => friendship.sender as Profile | null)
        .filter((friend): friend is Profile => Boolean(friend));

      const uniqueFriendsMap = new Map<string, Profile>();
      [...sentFriends, ...receivedFriends].forEach(friend => {
        if (friend.id !== childId) {
          uniqueFriendsMap.set(friend.id, friend);
        }
      });

      const allFriends = Array.from(uniqueFriendsMap.values());

      const friendIds = allFriends.map(friend => friend.id);
      let wishesMap: Record<string, boolean> = {};

      if (friendIds.length > 0) {
        const { data: wishesData, error: wishesError } = await supabase
          .from('birthday_wishes')
          .select('birthday_child_id, sent_at')
          .eq('sender_child_id', childId)
          .in('birthday_child_id', friendIds);

        if (wishesError) {
          console.error('Error loading birthday wishes:', wishesError);
        } else {
          wishesMap = (wishesData || []).reduce<Record<string, boolean>>((acc, wish) => {
            const nextBirthday = getNextBirthday(allFriends.find(f => f.id === wish.birthday_child_id)?.birthday || null);
            if (!nextBirthday) return acc;
            const wishYear = new Date(wish.sent_at).getFullYear();
            if (wishYear === nextBirthday.date.getFullYear()) {
              acc[wish.birthday_child_id] = true;
            }
            return acc;
          }, {});
        }
      }

      const friendsWithDate: FriendBirthday[] = [];
      const friendsMissingDate: Profile[] = [];

      allFriends.forEach(friend => {
        if (friend.birthday) {
          const next = getNextBirthday(friend.birthday);
          if (next) {
            friendsWithDate.push({
              ...friend,
              daysUntil: next.daysUntil,
              nextBirthday: next.date,
              hasWished: Boolean(wishesMap[friend.id])
            });
          }
        } else {
          friendsMissingDate.push(friend);
        }
      });

      friendsWithDate.sort((a, b) => {
        const aDays = a.daysUntil ?? Number.MAX_SAFE_INTEGER;
        const bDays = b.daysUntil ?? Number.MAX_SAFE_INTEGER;
        return aDays - bDays;
      });

      setFriendsWithBirthdays(friendsWithDate);
      setFriendsWithoutBirthday(friendsMissingDate);
      setWishSelections(prev => {
        const nextSelections: Record<string, { message: string; gift: string }> = {};
        friendsWithDate.forEach(friend => {
          nextSelections[friend.id] = prev[friend.id] || {
            message: MESSAGE_TEMPLATES[0],
            gift: VIRTUAL_GIFTS[0]
          };
        });
        return nextSelections;
      });
    } catch (error) {
      console.error('Error loading birthday card data:', error);
      setFeedback({ type: 'error', message: 'Impossible de charger les anniversaires pour le moment.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBirthday() {
    if (!currentChildId || !birthdayInput) return;
    setUpdatingBirthday(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ birthday: birthdayInput })
        .eq('id', currentChildId);

      if (error) throw error;

      setChildBirthday(birthdayInput);
      setEditingBirthday(false);
      setFeedback({ type: 'success', message: 'Ta date d\'anniversaire a été enregistrée !' });
    } catch (error) {
      console.error('Error updating birthday:', error);
      setFeedback({ type: 'error', message: 'Oups, impossible de sauvegarder la date. Réessaie plus tard.' });
    } finally {
      setUpdatingBirthday(false);
    }
  }

  async function handleWishFriend(friend: FriendBirthday) {
    if (!currentChildId) return;
    const selection = wishSelections[friend.id] || {
      message: MESSAGE_TEMPLATES[0],
      gift: VIRTUAL_GIFTS[0]
    };

    setSendingWishId(friend.id);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('birthday_wishes')
        .insert({
          birthday_child_id: friend.id,
          sender_child_id: currentChildId,
          message_template: selection.message,
          virtual_gift: selection.gift
        });

      if (error) throw error;

      setFriendsWithBirthdays(prev =>
        prev.map(existingFriend =>
          existingFriend.id === friend.id
            ? { ...existingFriend, hasWished: true }
            : existingFriend
        )
      );
      setFeedback({ type: 'success', message: `Message envoyé à ${friend.full_name} !` });
    } catch (error) {
      console.error('Error sending birthday wish:', error);
      setFeedback({ type: 'error', message: 'Impossible d\'envoyer le message. Essaie encore !' });
    } finally {
      setSendingWishId(null);
    }
  }

  function updateWishSelection(friendId: string, field: 'message' | 'gift', value: string) {
    setWishSelections(prev => ({
      ...prev,
      [friendId]: {
        message: field === 'message' ? value : prev[friendId]?.message || MESSAGE_TEMPLATES[0],
        gift: field === 'gift' ? value : prev[friendId]?.gift || VIRTUAL_GIFTS[0]
      }
    }));
  }

  const canEditBirthday = profile?.role === 'child' || profile?.role === 'parent';

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-2xl p-5 md:p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
              <div className="relative bg-white/30 backdrop-blur-sm p-2.5 md:p-3 rounded-2xl">
                <Cake size={36} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black mb-2">Anniversaires Magiques</h2>
            <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
              Ajoute ta date d'anniversaire et prépare des surprises pour tes amis !
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold backdrop-blur-sm bg-white/20 border ${feedback.type === 'success' ? 'border-emerald-200 text-emerald-100' : 'border-rose-200 text-rose-100'}`}
          >
            {feedback.message}
          </div>
        )}

        <div className="bg-white/15 rounded-2xl p-4 mb-6 border border-white/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarHeart size={20} className="text-pink-200" />
                Mon anniversaire
              </h3>
              {loading ? (
                <p className="text-white/80 text-sm mt-2">Chargement...</p>
              ) : childBirthday ? (
                <p className="text-white font-semibold text-lg mt-1">
                  {nextBirthdayLabel}
                </p>
              ) : (
                <p className="text-white/80 text-sm mt-2">
                  Dis-nous quand tu fêtes ton anniversaire pour recevoir des surprises personnalisées !
                </p>
              )}
            </div>
            {canEditBirthday && (
              <button
                onClick={() => {
                  if (!editingBirthday) {
                    setBirthdayInput(childBirthday || '');
                  }
                  setEditingBirthday(!editingBirthday);
                }}
                className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-semibold px-3 py-2 rounded-xl"
              >
                {editingBirthday ? 'Annuler' : childBirthday ? 'Modifier' : 'Ajouter'}
              </button>
            )}
          </div>

          {editingBirthday && (
            <div className="mt-4 flex flex-col gap-3">
              <input
                type="date"
                value={birthdayInput}
                onChange={(event) => setBirthdayInput(event.target.value)}
                className="px-3 py-2 rounded-lg text-gray-900"
                max="2099-12-31"
              />
              <button
                onClick={handleSaveBirthday}
                disabled={!birthdayInput || updatingBirthday}
                className="flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-500 text-emerald-900 font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                {updatingBirthday ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <PartyPopper size={20} className="text-yellow-200" />
              <h3 className="text-lg font-bold">Anniversaires à venir</h3>
            </div>
            {loading ? (
              <p className="text-white/80 text-sm">On prépare la liste de tes amis...</p>
            ) : friendsWithBirthdays.length === 0 ? (
              <div className="bg-white/10 border border-dashed border-white/30 rounded-2xl p-4 text-sm text-white/80">
                <p>Aucun anniversaire à l'horizon pour le moment.</p>
                {friendsWithoutBirthday.length > 0 ? (
                  <p className="mt-2">Invite tes amis à ajouter leur date pour préparer des surprises !</p>
                ) : (
                  <p className="mt-2">Ajoute des amis pour découvrir leurs anniversaires magiques.</p>
                )}
                {onManageFriends && (
                  <button
                    onClick={onManageFriends}
                    className="mt-3 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-2 rounded-xl transition-colors"
                  >
                    <Users size={18} /> Voir mes amis
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {friendsWithBirthdays.map(friend => {
                  const selection = wishSelections[friend.id] || {
                    message: MESSAGE_TEMPLATES[0],
                    gift: VIRTUAL_GIFTS[0]
                  };
                  const days = friend.daysUntil ?? 0;
                  const formattedDate = friend.nextBirthday
                    ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' }).format(friend.nextBirthday)
                    : null;
                  const isToday = days === 0;

                  return (
                    <div
                      key={friend.id}
                      className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold">{friend.full_name}</p>
                            {formattedDate && (
                              <p className="text-sm text-white/80">
                                {isToday
                                  ? 'C\'est aujourd\'hui ! 🎉'
                                  : days === 1
                                    ? `Demain (${formattedDate})`
                                    : `Dans ${days} jour${days > 1 ? 's' : ''} (${formattedDate})`}
                              </p>
                            )}
                          </div>
                          {friend.hasWished && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-emerald-400/20 text-emerald-100 px-2.5 py-1 rounded-full">
                              <Sparkles size={14} /> Surprise envoyée
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col lg:flex-row gap-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-white/80">Message</label>
                              <select
                                value={selection.message}
                                onChange={(event) => updateWishSelection(friend.id, 'message', event.target.value)}
                                className="text-gray-900 rounded-lg px-3 py-2"
                              >
                                {MESSAGE_TEMPLATES.map(template => (
                                  <option key={template} value={template}>{template}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-white/80">Cadeau virtuel</label>
                              <select
                                value={selection.gift}
                                onChange={(event) => updateWishSelection(friend.id, 'gift', event.target.value)}
                                className="text-gray-900 rounded-lg px-3 py-2"
                              >
                                {VIRTUAL_GIFTS.map(gift => (
                                  <option key={gift} value={gift}>{gift}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => handleWishFriend(friend)}
                              disabled={friend.hasWished || sendingWishId === friend.id}
                              className="flex items-center justify-center gap-2 bg-white text-indigo-600 font-bold px-4 py-2.5 rounded-xl transition-transform transform hover:-translate-y-0.5 disabled:opacity-60"
                            >
                              {sendingWishId === friend.id ? 'Envoi...' : <><Gift size={18} /> Envoyer la surprise</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {friendsWithoutBirthday.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4 border border-dashed border-white/20">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={16} /> Amis sans date d'anniversaire
              </h4>
              <p className="text-sm text-white/80">
                Encourage tes amis à ajouter leur anniversaire pour que tu puisses leur préparer des surprises magiques !
              </p>
              <ul className="mt-3 text-sm text-white/90 list-disc list-inside space-y-1">
                {friendsWithoutBirthday.map(friend => (
                  <li key={friend.id}>{friend.full_name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
