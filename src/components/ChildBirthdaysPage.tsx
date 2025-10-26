import { useMemo, useState } from 'react';
import { ArrowLeft, PartyPopper, Sparkles } from 'lucide-react';
import { BirthdayCard } from './BirthdayCard';
import { formatBirthdayNumeric, getNextBirthday } from '../utils/birthday';

type ChildBirthdaysPageProps = {
  childId: string;
  onBack: () => void;
  onManageFriends?: () => void;
};

type MessageVariant = 'info' | 'success';

type BannerMessage = {
  title: string;
  description: string;
  variant: MessageVariant;
};

export function ChildBirthdaysPage({ childId, onBack, onManageFriends }: ChildBirthdaysPageProps) {
  const [childBirthday, setChildBirthday] = useState<string | null | undefined>(undefined);

  const bannerMessage: BannerMessage = useMemo(() => {
    if (childBirthday === undefined) {
      return {
        title: 'Nous préparons ta surprise...',
        description: 'Quelques instants, nous vérifions les anniversaires enregistrés.',
        variant: 'info'
      };
    }

    if (!childBirthday) {
      return {
        title: 'Demande à ton parent',
        description:
          'Invite ton parent à ajouter ta date d\'anniversaire depuis son profil pour recevoir un message spécial le jour J.',
        variant: 'info'
      };
    }

    const nextBirthday = getNextBirthday(childBirthday);
    const formattedDate = formatBirthdayNumeric(childBirthday);

    let countdownText = '';
    if (nextBirthday) {
      if (nextBirthday.daysUntil === 0) {
        countdownText = "c'est aujourd'hui ! 🎉";
      } else if (nextBirthday.daysUntil === 1) {
        countdownText = 'dans 1 jour';
      } else {
        countdownText = `dans ${nextBirthday.daysUntil} jours`;
      }
    }

    return {
      title: 'Ton anniversaire est enregistré !',
      description: formattedDate
        ? `Ton jour d'anniversaire est le ${formattedDate}${countdownText ? ` (${countdownText})` : ''}. Tes parents peuvent le mettre à jour depuis leur espace parent.`
        : 'Ton anniversaire est enregistré par tes parents. Tes parents peuvent le mettre à jour depuis leur espace parent.',
      variant: 'success'
    };
  }, [childBirthday]);

  const bannerStyles =
    bannerMessage.variant === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-sky-50 border-sky-200 text-sky-700';

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
            Anniversaires
          </div>
        </div>

        <div className={`mb-6 flex items-start gap-3 rounded-3xl border px-5 py-4 shadow-sm ${bannerStyles}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-current">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">{bannerMessage.title}</h2>
            <p className="mt-1 text-sm leading-relaxed">{bannerMessage.description}</p>
          </div>
        </div>

        <BirthdayCard
          currentChildId={childId}
          onManageFriends={onManageFriends}
          onChildBirthdayLoaded={setChildBirthday}
        />
      </div>
    </div>
  );
}
