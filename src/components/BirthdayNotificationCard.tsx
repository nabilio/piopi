import { PartyPopper, CalendarHeart, Sparkles } from 'lucide-react';

type BirthdayNotificationCardProps = {
  onAction: () => void;
};

export function BirthdayNotificationCard({ onAction }: BirthdayNotificationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-pink-100/70 bg-white/90 p-6 shadow-[0_25px_60px_-35px_rgba(244,114,182,0.8)]">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/70 via-purple-200/60 to-orange-200/60 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-purple-200/60 via-pink-200/50 to-orange-200/50 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 text-white shadow-lg">
            <PartyPopper className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Partage ta date d'anniversaire 🎉</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Dis-nous quand c'est ta journée spéciale pour que nous préparions des surprises personnalisées !
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-100 to-orange-100 px-3 py-1 text-xs font-semibold text-pink-600">
              <CalendarHeart className="h-4 w-4" />
              Une surprise rien que pour toi
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60"
        >
          <Sparkles className="h-4 w-4" />
          Ajouter ma date
        </button>
      </div>
    </div>
  );
}
