import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CalendarHeart, Loader2, PartyPopper, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  ChildBirthdayRecord,
  computeNextBirthday,
  fetchParentChildBirthdays,
  formatBirthday,
  updateChildBirthday,
} from '../lib/birthdayService';

type ParentBirthdaysProps = {
  onBack: () => void;
  parentId: string;
};

type RowFeedback = {
  type: 'success' | 'error';
  message: string;
};

export function ParentBirthdays({ onBack, parentId }: ParentBirthdaysProps) {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildBirthdayRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, RowFeedback | null>>({});

  useEffect(() => {
    let mounted = true;

    async function loadChildren() {
      setLoading(true);
      setError(null);
      try {
        const records = await fetchParentChildBirthdays(parentId);
        if (!mounted) {
          return;
        }
        setChildren(records);
        setEdits(
          records.reduce<Record<string, string>>((acc, record) => {
            acc[record.id] = record.birthday ?? '';
            return acc;
          }, {}),
        );
        setFeedback(
          records.reduce<Record<string, RowFeedback | null>>((acc, record) => {
            acc[record.id] = null;
            return acc;
          }, {}),
        );
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Impossible de charger les anniversaires.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadChildren();

    return () => {
      mounted = false;
    };
  }, [parentId]);

  const childrenWithUpcoming = useMemo(
    () =>
      children.map((child) => ({
        ...child,
        formattedBirthday: formatBirthday(child.birthday),
        nextBirthday: computeNextBirthday(child.birthday),
      })),
    [children],
  );

  async function handleSave(childId: string) {
    const value = edits[childId] ?? '';

    if (!value) {
      setFeedback((previous) => ({
        ...previous,
        [childId]: { type: 'error', message: "Sélectionnez une date d'anniversaire." },
      }));
      return;
    }

    setSaving((previous) => ({ ...previous, [childId]: true }));
    setFeedback((previous) => ({ ...previous, [childId]: null }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const result = await updateChildBirthday(session.access_token, {
        birthday: value,
        consent: true,
        childId,
      });

      setChildren((previous) =>
        previous.map((child) =>
          child.id === childId
            ? { ...child, birthday: result.birthday, birthdayCompleted: true }
            : child,
        ),
      );
      setEdits((previous) => ({ ...previous, [childId]: result.birthday }));
      setFeedback((previous) => ({
        ...previous,
        [childId]: { type: 'success', message: "Date d'anniversaire enregistrée." },
      }));
    } catch (err) {
      setFeedback((previous) => ({
        ...previous,
        [childId]: {
          type: 'error',
          message: err instanceof Error ? err.message : "Impossible d'enregistrer l'anniversaire",
        },
      }));
    } finally {
      setSaving((previous) => ({ ...previous, [childId]: false }));
    }
  }

  async function handleClear(childId: string) {
    setSaving((previous) => ({ ...previous, [childId]: true }));
    setFeedback((previous) => ({ ...previous, [childId]: null }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const result = await updateChildBirthday(session.access_token, {
        birthday: null,
        consent: true,
        childId,
      });

      setChildren((previous) =>
        previous.map((child) =>
          child.id === childId
            ? { ...child, birthday: result.birthday, birthdayCompleted: false }
            : child,
        ),
      );
      setEdits((previous) => ({ ...previous, [childId]: '' }));
      setFeedback((previous) => ({
        ...previous,
        [childId]: { type: 'success', message: "Date d'anniversaire supprimée." },
      }));
    } catch (err) {
      setFeedback((previous) => ({
        ...previous,
        [childId]: {
          type: 'error',
          message: err instanceof Error ? err.message : "Impossible de supprimer l'anniversaire",
        },
      }));
    } finally {
      setSaving((previous) => ({ ...previous, [childId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow transition hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow">
            <CalendarDays className="h-4 w-4" />
            Gestion des anniversaires
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-100 bg-white/70 px-6 py-16 text-center text-purple-600 shadow">
            <Loader2 className="mb-4 h-10 w-10 animate-spin" />
            Chargement des anniversaires…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 shadow-sm">{error}</div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                    <PartyPopper className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-600">Enfants connectés</p>
                    <p className="text-2xl font-bold text-gray-900">{children.length}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Ajoutez les dates pour personnaliser les surprises dans l'espace enfant.
                </p>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                    <CalendarHeart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-600">Anniversaires enregistrés</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {children.filter((child) => Boolean(child.birthday)).length}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Dès qu'une date est enregistrée, les surprises sont activées pour votre enfant.
                </p>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-600">Prochains anniversaires</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {
                        childrenWithUpcoming.filter(
                          (child) => child.nextBirthday && child.nextBirthday.daysUntil <= 30,
                        ).length
                      }
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Consultez les anniversaires à venir dans les 30 prochains jours pour vous organiser sereinement.
                </p>
              </div>
            </div>

            {children.length === 0 ? (
              <div className="rounded-3xl border border-purple-100 bg-white p-8 text-center shadow-lg">
                <p className="text-lg font-semibold text-gray-800">
                  Aucun enfant n'est encore connecté à votre compte.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Ajoutez le profil de votre enfant pour suivre ses anniversaires et ses progrès.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {childrenWithUpcoming.map((child) => {
                  const rowFeedback = feedback[child.id];
                  const isSaving = saving[child.id];
                  const value = edits[child.id] ?? '';

                  return (
                    <div key={child.id} className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{child.fullName}</h3>
                          {child.formattedBirthday ? (
                            <p className="text-sm text-gray-600">
                              Anniversaire enregistré : {child.formattedBirthday}
                              {child.nextBirthday
                                ? child.nextBirthday.daysUntil === 0
                                  ? " — c'est aujourd'hui ! 🎉"
                                  : child.nextBirthday.daysUntil === 1
                                  ? ' — dans 1 jour'
                                  : ` — dans ${child.nextBirthday.daysUntil} jours`
                                : ''}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">
                              Aucune date enregistrée pour le moment.
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
                          {child.birthdayCompleted ? 'Date confirmée' : 'Action requise'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[200px_auto_auto_auto] md:items-end">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-gray-700">Date d'anniversaire</span>
                          <input
                            type="date"
                            value={value}
                            onChange={(event) => {
                              const newValue = event.target.value;
                              setEdits((previous) => ({ ...previous, [child.id]: newValue }));
                              setFeedback((previous) => ({ ...previous, [child.id]: null }));
                            }}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleSave(child.id)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                          Enregistrer
                        </button>

                        <button
                          type="button"
                          onClick={() => handleClear(child.id)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                          Supprimer la date
                        </button>

                        {rowFeedback && (
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                              rowFeedback.type === 'success'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border border-red-200 bg-red-50 text-red-700'
                            }`}
                          >
                            {rowFeedback.message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
