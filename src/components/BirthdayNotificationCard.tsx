import { PartyPopper, CalendarHeart, Sparkles } from 'lucide-react';

type BirthdayNotificationCardProps = {
  onAction: () => void;
};

export function BirthdayNotificationCard({ onAction }: BirthdayNotificationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white shadow-[0_35px_80px_-40px_rgba(190,75,219,0.9)]">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rotate-6 rounded-full bg-white/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-orange-400/40 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="flex flex-1 items-start gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/20 text-white shadow-inner backdrop-blur-sm">
            <PartyPopper className="h-10 w-10" />
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Anniversaire</p>
            <h3 className="mt-2 text-2xl font-black leading-snug sm:text-3xl">
              C'est quand ta journée magique ?
            </h3>
            <p className="mt-3 text-sm text-white/90 sm:text-base">
              Indique-nous ta date pour recevoir un message surprise et des bonus scintillants le jour J.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white/90 shadow-inner">
              <CalendarHeart className="h-4 w-4" />
              Nous préparons déjà la fête 🎈
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/95 px-6 py-3 text-sm font-semibold text-pink-600 shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Sparkles className="h-4 w-4" />
          Ajouter ma date
        </button>
      </div>
    </div>
  );
}
