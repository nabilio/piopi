import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarHeart, Loader2, PartyPopper, Sparkles, Users } from 'lucide-react';
import {
  ChildBirthdayRecord,
  computeNextBirthday,
  fetchChildBirthday,
  fetchChildFriendBirthdays,
  formatBirthday,
} from '../lib/birthdayService';

interface ChildBirthdaysPageProps {
  childId: string;
  onBack: () => void;
}

export function ChildBirthdaysPage({ childId, onBack }: ChildBirthdaysPageProps) {
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<ChildBirthdayRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<ChildBirthdayRecord[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadChild() {
      setLoading(true);
      setError(null);
      try {
        const record = await fetchChildBirthday(childId);
        if (!mounted) {
          return;
        }
        setChild(record);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Impossible de charger les informations d'anniversaire");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadChild();

    return () => {
      mounted = false;
    };
  }, [childId]);

  useEffect(() => {
    let mounted = true;

    async function loadFriends() {
      setFriendsLoading(true);
      setFriendsError(null);

      try {
        const records = await fetchChildFriendBirthdays(childId);
        if (!mounted) {
          return;
        }
        setFriends(records);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setFriendsError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les anniversaires de tes amis.",
        );
      } finally {
        if (mounted) {
          setFriendsLoading(false);
        }
      }
    }

    loadFriends();

    return () => {
      mounted = false;
    };
  }, [childId]);

  const summary = useMemo(() => {
    if (!child) {
      return {
        title: 'Chargement des informations…',
        description: 'Quelques instants, nous préparons ta page anniversaire.',
        variant: 'info' as const,
      };
    }

    if (!child.birthday) {
      return {
        title: 'Demande à ton parent',
        description:
          "Invite ton parent à ajouter ta date d'anniversaire pour débloquer un message magique et des surprises.",
        variant: 'info' as const,
      };
    }

    const formatted = formatBirthday(child.birthday);
    const next = computeNextBirthday(child.birthday);
    let details = '';

    if (next) {
      if (next.daysUntil === 0) {
        details = " — c'est aujourd'hui ! 🎉";
      } else if (next.daysUntil === 1) {
        details = ' — dans 1 jour';
      } else {
        details = ` — dans ${next.daysUntil} jours`;
      }
    }

    return {
      title: 'Ton anniversaire est enregistré !',
      description: formatted
        ? `Nous fêterons ton anniversaire le ${formatted}${details}. Tes parents peuvent le mettre à jour à tout moment.`
        : 'Ton anniversaire est enregistré. Tes parents peuvent le mettre à jour à tout moment.',
      variant: 'success' as const,
    };
  }, [child]);

  const friendsWithUpcoming = useMemo(() => {
    return friends
      .map((friend) => {
        const nextBirthday = computeNextBirthday(friend.birthday);
        return {
          ...friend,
          formattedBirthday: formatBirthday(friend.birthday),
          nextBirthday,
          daysUntil: nextBirthday ? nextBirthday.daysUntil : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [friends]);

  const bannerClasses =
    summary.variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-sky-200 bg-sky-50 text-sky-700';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow transition hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow">
            <PartyPopper className="h-4 w-4" />
            Anniversaire
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-100 bg-white/60 px-6 py-16 text-center text-purple-600 shadow">
            <Loader2 className="mb-4 h-10 w-10 animate-spin" />
            Chargement de ton espace anniversaire…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`flex items-start gap-3 rounded-3xl border px-5 py-4 shadow-sm ${bannerClasses}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-current">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">{summary.title}</h2>
                <p className="mt-1 text-sm leading-relaxed">{summary.description}</p>
              </div>
            </div>

            {!child?.birthday && (
              <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg">
                <div className="flex items-center gap-3 text-sky-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                    <CalendarHeart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Ton parent doit ajouter ta date</h3>
                    <p className="text-sm text-gray-600">
                      Rappelle-lui de se connecter à son espace pour enregistrer ton anniversaire et débloquer ta surprise.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center gap-3 text-purple-600">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Les anniversaires de tes amis</h3>
                  <p className="text-sm text-gray-600">
                    Découvre qui soufflera bientôt ses bougies pour lui préparer une belle surprise.
                  </p>
                </div>
              </div>

              {friendsLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 px-4 py-3 text-purple-700">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement des anniversaires de tes amis…
                </div>
              ) : friendsError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {friendsError}
                </div>
              ) : friendsWithUpcoming.length === 0 ? (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/60 px-4 py-3 text-sm text-purple-700">
                  Ajoute des amis pour découvrir leurs anniversaires à venir !
                </div>
              ) : (
                <ul className="space-y-3">
                  {friendsWithUpcoming.map((friend) => (
                    <li
                      key={friend.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-purple-50/40 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{friend.fullName}</p>
                        {friend.formattedBirthday ? (
                          <p className="text-xs text-gray-600">
                            Anniversaire le {friend.formattedBirthday}
                            {friend.nextBirthday && Number.isFinite(friend.daysUntil)
                              ? friend.daysUntil === 0
                                ? " — c'est aujourd'hui ! 🎉"
                                : friend.daysUntil === 1
                                  ? ' — dans 1 jour'
                                  : ` — dans ${friend.daysUntil} jours`
                              : ''}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-600">Anniversaire encore tenu secret.</p>
                        )}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-purple-600">
                        {friend.formattedBirthday ? 'Date partagée' : 'En attente'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
