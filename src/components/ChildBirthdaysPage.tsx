import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarHeart, Loader2, PartyPopper, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  ChildBirthdayRecord,
  computeNextBirthday,
  fetchChildBirthday,
  formatBirthday,
  updateChildBirthday,
} from '../lib/birthdayService';

interface ChildBirthdaysPageProps {
  childId: string;
  onBack: () => void;
  onManageFriends?: () => void;
}

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

export function ChildBirthdaysPage({ childId, onBack, onManageFriends }: ChildBirthdaysPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [child, setChild] = useState<ChildBirthdayRecord | null>(null);
  const [formBirthday, setFormBirthday] = useState('');
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setFormBirthday(record.birthday ?? '');
        setConsent(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!child) {
      return;
    }

    if (!formBirthday) {
      setFeedback({ type: 'error', message: "Sélectionne une date d'anniversaire." });
      return;
    }

    if (!consent) {
      setFeedback({ type: 'error', message: 'Le consentement parental est obligatoire.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const result = await updateChildBirthday(session.access_token, {
        birthday: formBirthday,
        consent,
        childId,
      });

      setChild((previous) =>
        previous
          ? {
              ...previous,
              birthday: result.birthday,
              birthdayCompleted: true,
            }
          : previous,
      );
      setFormBirthday(result.birthday);
      setConsent(false);
      setFeedback({ type: 'success', message: 'Anniversaire enregistré avec succès ! 🎉' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : "Impossible d'enregistrer l'anniversaire",
      });
    } finally {
      setSaving(false);
    }
  }

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

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg"
            >
              <div className="mb-6 flex items-center gap-3 text-purple-600">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                  <CalendarHeart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {child?.fullName ? `L'anniversaire de ${child.fullName}` : 'Ton anniversaire magique'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choisis la bonne date pour recevoir un message spécial le jour J.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Date d'anniversaire</span>
                  <input
                    type="date"
                    value={formBirthday}
                    onChange={(event) => {
                      setFormBirthday(event.target.value);
                      setFeedback(null);
                    }}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => {
                      setConsent(event.target.checked);
                      setFeedback(null);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>
                    Je confirme que mon parent ou responsable légal est d'accord pour partager cette date d'anniversaire.
                  </span>
                </label>

                {feedback && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enregistrer ma date
                  </button>
                  {onManageFriends && (
                    <button
                      type="button"
                      onClick={onManageFriends}
                      className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition hover:bg-purple-50"
                    >
                      Voir les anniversaires de mes amis
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
