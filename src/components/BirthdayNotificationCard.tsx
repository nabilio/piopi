import { PartyPopper, CalendarHeart, Sparkles, ArrowRight } from 'lucide-react';

type BirthdayNotificationCardProps = {
  onAction: () => void;
  className?: string;
};

export function BirthdayNotificationCard({ onAction, className = '' }: BirthdayNotificationCardProps) {
  return (
    <button
      type="button"
      onClick={onAction}
      className={`group relative h-full w-full overflow-hidden rounded-4xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-left text-white shadow-[0_35px_80px_-40px_rgba(190,75,219,0.9)] transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rotate-6 rounded-full bg-white/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-orange-400/40 blur-3xl" aria-hidden />

      <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/20 text-white shadow-inner backdrop-blur-sm">
            <PartyPopper className="h-9 w-9" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">Anniversaire</p>
            <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Anniversaire</h3>
            <p className="mt-3 text-sm text-white/80 sm:text-base">
              Indique-nous ta date pour recevoir un message surprise et des bonus scintillants le jour J.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-white/90">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/80 shadow-inner">
            <CalendarHeart className="h-4 w-4" />
            Nous préparons déjà la fête
          </div>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">Ajouter ma date</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}
