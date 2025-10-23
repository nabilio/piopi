import type { KeyboardEvent, MouseEvent } from 'react';
import { CalendarHeart, Gift, PartyPopper, Sparkles } from 'lucide-react';

type BirthdayNotificationCardProps = {
  onAction: () => void;
  birthday?: string | null;
  isCompleted?: boolean;
  showReminder?: boolean;
  disabled?: boolean;
};

function formatBirthday(birthday?: string | null) {
  if (!birthday) return null;

  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

export function BirthdayNotificationCard({
  onAction,
  birthday,
  isCompleted = false,
  showReminder = false,
  disabled = false,
}: BirthdayNotificationCardProps) {
  const formattedBirthday = formatBirthday(birthday);

  function handleClick() {
    if (disabled) return;
    onAction();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAction();
    }
  }

  function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (disabled) return;
    onAction();
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 rounded-2xl shadow-2xl p-5 md:p-6 text-white overflow-hidden transition-all ${
        disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-3xl hover:-translate-y-1'
      }`}
      aria-disabled={disabled}
      aria-label="Mon espace anniversaire"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" aria-hidden />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden />

      {showReminder && !isCompleted && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-purple-600 shadow">
            <Sparkles size={14} />
            Nouveau
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/30 backdrop-blur-sm p-2.5 rounded-2xl shadow-inner">
            <PartyPopper size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black">Mon anniversaire</h2>
            <p className="text-white/90 text-sm md:text-base">
              Prépare une fête magique et découvre les surprises PioPi !
            </p>
          </div>
        </div>

        <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          {isCompleted && formattedBirthday ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <CalendarHeart size={18} className="text-white" />
                Anniversaire enregistré : {formattedBirthday}
              </p>
              <p className="text-xs text-white/80">
                Tu peux mettre ta date à jour à tout moment pour garder tes surprises à jour.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <CalendarHeart size={18} className="text-white" />
                Ajoute ta date d'anniversaire pour débloquer des surprises !
              </p>
              <p className="text-xs text-white/80">
                Tes parents recevront une invitation magique et un compte à rebours spécial.
              </p>
            </div>
          )}
        </div>

        <ul className="text-sm text-white/85 space-y-2">
          <li className="flex items-center gap-2">
            <Gift size={16} className="text-white" />
            Surprises personnalisées et messages de tes amis
          </li>
          <li className="flex items-center gap-2">
            <Sparkles size={16} className="text-white" />
            Compte à rebours magique jusqu'à ta fête
          </li>
          <li className="flex items-center gap-2">
            <PartyPopper size={16} className="text-white" />
            Invitations à partager avec ta famille
          </li>
        </ul>

        <div>
          <button
            type="button"
            onClick={handleButtonClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-600 font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
            disabled={disabled}
          >
            <Sparkles size={18} />
            {isCompleted ? 'Mettre à jour ma date' : 'Ajouter ma date'}
          </button>
        </div>
      </div>
    </div>
  );
}
