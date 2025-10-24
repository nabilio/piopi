import { useEffect, useState } from 'react';
import { CalendarHeart, ShieldCheck, X, Sparkles } from 'lucide-react';

type ChildBirthdayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { birthday: string; consent: boolean }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  successMessage?: string | null;
  onResetFeedback?: () => void;
  defaultBirthday?: string | null;
};

export function ChildBirthdayModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  error = null,
  successMessage = null,
  onResetFeedback,
  defaultBirthday = null,
}: ChildBirthdayModalProps) {
  const [birthday, setBirthday] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBirthday(defaultBirthday ?? '');
      setConsent(false);
      onResetFeedback?.();
    }
  }, [defaultBirthday, isOpen, onResetFeedback]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ birthday, consent });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
          aria-label="Fermer le formulaire d'anniversaire"
        >
          <X size={18} />
        </button>

        <div className="rounded-t-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <CalendarHeart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Préparons ton anniversaire 🎂</h2>
              <p className="text-sm text-white/90">
                Avec l'accord de ton parent, indique ta date pour recevoir des surprises personnalisées.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label htmlFor="birthday" className="mb-2 block text-sm font-semibold text-gray-700">
              Date d'anniversaire
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              required
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
              className="w-full rounded-2xl border-2 border-purple-200 px-4 py-3 text-base shadow-sm transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>
              Je confirme que mon parent ou responsable légal est d'accord pour que je partage ma date d'anniversaire.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <ShieldCheck className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <Sparkles className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Plus tard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Enregistrement...' : 'Valider avec mon parent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
