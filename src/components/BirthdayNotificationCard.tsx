import { PartyPopper, CalendarHeart, Sparkles } from 'lucide-react';

type BirthdayNotificationCardProps = {
  onAction: () => void;
};

export function BirthdayNotificationCard({ onAction }: BirthdayNotificationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 p-5 shadow-lg">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-purple-200/40" aria-hidden />
      <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-pink-200/40" aria-hidden />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
            <PartyPopper className="h-7 w-7 text-purple-500" />
          </div>
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-500">
              <CalendarHeart className="h-4 w-4" />
              C'est bientôt la fête !
            </p>
            <h3 className="text-lg font-bold text-gray-800">
              Partage ta date d'anniversaire avec ton parent 🎉
            </h3>
            <p className="text-sm text-gray-600">
              Nous préparerons des surprises et des messages spéciaux pour ton grand jour.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-pink-600"
        >
          <Sparkles className="h-4 w-4" />
          Ajouter ma date
        </button>
      </div>
    </div>
  );
}
