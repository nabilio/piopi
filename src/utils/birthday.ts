export type NextBirthdayInfo = {
  date: Date;
  daysUntil: number;
};

export function formatBirthdayLong(dateString: string | null): string | null {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  if (!month || !day) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' });
  return formatter.format(new Date(Date.UTC(year || 2000, month - 1, day)));
}

export function formatBirthdayNumeric(dateString: string | null): string | null {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return formatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export function getNextBirthday(dateString: string | null): NextBirthdayInfo | null {
  if (!dateString) {
    return null;
  }

  const parts = dateString.split('-').map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) {
    return null;
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let next = new Date(Date.UTC(today.getFullYear(), month - 1, day));

  if (next < todayUtc) {
    next = new Date(Date.UTC(today.getFullYear() + 1, month - 1, day));
  }

  const diffTime = next.getTime() - todayUtc.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return { date: next, daysUntil };
}
