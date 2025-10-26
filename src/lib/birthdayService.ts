import { supabase } from './supabase';

export type ChildBirthdayRecord = {
  id: string;
  fullName: string;
  birthday: string | null;
  birthdayCompleted: boolean;
};

export type UpdateBirthdayParams = {
  birthday: string | null;
  consent: boolean;
  childId?: string;
};

export type UpdateBirthdayResult = {
  childId: string;
  birthday: string | null;
};

const ISO_BIRTHDAY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

type ResponseLike = {
  clone?: () => ResponseLike;
  text?: () => Promise<string>;
};

function isResponseLike(value: unknown): value is ResponseLike {
  return (
    !!value &&
    typeof value === 'object' &&
    ('text' in (value as ResponseLike) && typeof (value as ResponseLike).text === 'function')
  );
}

async function extractMessageFromResponseLike(source: unknown): Promise<string> {
  if (!isResponseLike(source)) {
    return '';
  }

  try {
    const response = typeof source.clone === 'function' ? source.clone() : source;
    const text = typeof response.text === 'function' ? await response.text() : '';

    if (!text) {
      return '';
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (typeof (parsed as { error?: unknown }).error === 'string') {
          return (parsed as { error?: string }).error ?? '';
        }
        if (typeof (parsed as { message?: unknown }).message === 'string') {
          return (parsed as { message?: string }).message ?? '';
        }
      }
    } catch {
      // Ignore JSON parse failures and fall through to return raw text.
    }

    return text;
  } catch {
    return '';
  }
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message?.trim();
    const genericEdgeMessages = new Set([
      'Edge Function returned a non-2xx status code',
      'Relay Error invoking the Edge Function',
      'Failed to send a request to the Edge Function',
    ]);

    const contextMessage = await extractMessageFromResponseLike((error as { context?: unknown }).context);
    if (contextMessage) {
      return contextMessage;
    }

    if (message && !genericEdgeMessages.has(message)) {
      return message;
    }

    if (message) {
      return message;
    }
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;

    if (typeof record.error === 'string') {
      return record.error;
    }

    if (record.error) {
      const nested = await extractErrorMessage(record.error);
      if (nested) {
        return nested;
      }
    }

    if (typeof record.message === 'string') {
      return record.message;
    }

    if (record.message) {
      const nested = await extractErrorMessage(record.message);
      if (nested) {
        return nested;
      }
    }

    if (typeof record.data === 'string') {
      try {
        const parsed = JSON.parse(record.data);
        return await extractErrorMessage(parsed);
      } catch {
        return record.data;
      }
    }

    if (record.data) {
      const nested = await extractErrorMessage(record.data);
      if (nested) {
        return nested;
      }
    }

    const contextMessage = await extractMessageFromResponseLike(record.response ?? record.context);
    if (contextMessage) {
      return contextMessage;
    }
  }

  return '';
}

async function mapUpdateError(error: unknown): Promise<string> {
  const rawMessage = (await extractErrorMessage(error)).trim();

  if (!rawMessage) {
    return "Impossible d'enregistrer l'anniversaire";
  }

  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('consent')) {
    return 'Le consentement parental est obligatoire.';
  }

  if (normalized.includes('profile not found') || normalized.includes('child profile not found')) {
    return 'Impossible de retrouver le profil à mettre à jour. Veuillez réessayer.';
  }

  if (normalized.includes('forbidden') || normalized.includes('unauthorized')) {
    return 'Vous ne pouvez pas modifier cet anniversaire avec votre compte actuel.';
  }

  if (normalized.includes('service configuration error')) {
    return "Le service anniversaire est indisponible. Contactez un administrateur.";
  }

  if (normalized.includes('database migration for birthday tracking is missing')) {
    return 'La base de données doit être mise à jour avant de pouvoir enregistrer les anniversaires.';
  }

  if (normalized.includes('row-level security') || normalized.includes('access to the profiles table is blocked')) {
    return "Accès refusé par la sécurité Supabase. Vérifiez les politiques d'accès.";
  }

  if (normalized.includes('invalid birthday format') || normalized.includes('birthday is required')) {
    return "Format de date invalide. Utilisez le format AAAA-MM-JJ.";
  }

  if (normalized.includes('childid is required')) {
    return "Veuillez sélectionner l'enfant à mettre à jour.";
  }

  if (normalized.includes('function invocation') || normalized.includes('edge function returned')) {
    return "Impossible d'enregistrer l'anniversaire pour le moment. Réessayez plus tard.";
  }

  return rawMessage;
}

function ensureValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function normalizeBirthday(value: string): string {
  if (!value) {
    throw new Error("La date d'anniversaire est requise");
  }

  const trimmed = value.trim();
  const match = trimmed.match(ISO_BIRTHDAY_REGEX);

  if (!match) {
    throw new Error('Format de date invalide (AAAA-MM-JJ attendu)');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!ensureValidDate(year, month, day)) {
    throw new Error("Date d'anniversaire invalide");
  }

  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
}

export function formatBirthday(dateString: string | null, locale: string = 'fr-FR'): string | null {
  if (!dateString) {
    return null;
  }

  try {
    const normalized = normalizeBirthday(dateString);
    const [, month, day] = normalized.split('-');
    const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long' });
    return formatter.format(new Date(Date.UTC(2000, Number(month) - 1, Number(day))));
  } catch {
    return null;
  }
}

export function computeNextBirthday(
  birthday: string | null,
  referenceDate: Date = new Date(),
): { date: Date; daysUntil: number } | null {
  if (!birthday) {
    return null;
  }

  let normalized: string;
  try {
    normalized = normalizeBirthday(birthday);
  } catch {
    return null;
  }

  const [, monthString, dayString] = normalized.split('-');
  const month = Number(monthString);
  const day = Number(dayString);

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  let next = new Date(referenceDate.getFullYear(), month - 1, day);

  if (Number.isNaN(next.getTime())) {
    return null;
  }

  if (next < today) {
    next = new Date(referenceDate.getFullYear() + 1, month - 1, day);
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diff = next.getTime() - today.getTime();
  const daysUntil = Math.round(diff / millisecondsPerDay);

  return { date: next, daysUntil };
}

function toChildBirthdayRecord(profile: any): ChildBirthdayRecord {
  const birthday = typeof profile.birthday === 'string' ? profile.birthday : null;
  const hasCompletionFlag = typeof profile.birthday_completed === 'boolean';

  return {
    id: String(profile.id),
    fullName:
      typeof profile.full_name === 'string' && profile.full_name.trim() !== ''
        ? profile.full_name
        : 'Enfant',
    birthday,
    birthdayCompleted: hasCompletionFlag ? Boolean(profile.birthday_completed) : Boolean(birthday),
  };
}

function isMissingBirthdayCompletionColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: unknown; details?: unknown; code?: unknown };
  const message =
    (typeof candidate.message === 'string' && candidate.message) ||
    (typeof candidate.details === 'string' && candidate.details) ||
    '';

  const code =
    typeof candidate.code === 'string'
      ? candidate.code.trim()
      : typeof candidate.code === 'number'
        ? String(candidate.code)
        : '';

  if (code === '42703') {
    return true;
  }

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  if (!normalized.includes('birthday_completed')) {
    return false;
  }

  return normalized.includes('does not exist') || normalized.includes('schema cache');
}

export async function fetchChildBirthday(childId: string): Promise<ChildBirthdayRecord> {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, birthday, birthday_completed')
    .eq('id', childId)
    .maybeSingle();

  if (error && isMissingBirthdayCompletionColumn(error)) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('id, full_name, birthday')
      .eq('id', childId)
      .maybeSingle());
  }

  if (error) {
    throw new Error("Impossible de charger les informations d'anniversaire de cet enfant.");
  }

  if (!data) {
    throw new Error('Profil enfant introuvable.');
  }

  return toChildBirthdayRecord(data);
}

export async function fetchParentChildBirthdays(parentId: string): Promise<ChildBirthdayRecord[]> {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, birthday, birthday_completed')
    .eq('parent_id', parentId)
    .eq('role', 'child')
    .order('full_name', { ascending: true });

  if (error && isMissingBirthdayCompletionColumn(error)) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('id, full_name, birthday')
      .eq('parent_id', parentId)
      .eq('role', 'child')
      .order('full_name', { ascending: true }));
  }

  if (error) {
    throw new Error('Impossible de charger les anniversaires.');
  }

  return (data ?? []).map(toChildBirthdayRecord);
}

export async function fetchChildFriendBirthdays(childId: string): Promise<ChildBirthdayRecord[]> {
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .eq('status', 'accepted')
    .or(`user_id.eq.${childId},friend_id.eq.${childId}`);

  if (friendshipsError) {
    throw new Error('Impossible de charger les anniversaires de tes amis.');
  }

  const friendIds = new Set<string>();

  for (const friendship of friendships ?? []) {
    const userId = typeof friendship.user_id === 'string' ? friendship.user_id : '';
    const friendId = typeof friendship.friend_id === 'string' ? friendship.friend_id : '';

    if (userId === childId && friendId && friendId !== childId) {
      friendIds.add(friendId);
    } else if (friendId === childId && userId && userId !== childId) {
      friendIds.add(userId);
    }
  }

  if (friendIds.size === 0) {
    return [];
  }

  let { data: friendProfiles, error: friendProfilesError } = await supabase
    .from('profiles')
    .select('id, full_name, birthday, birthday_completed, role')
    .in('id', Array.from(friendIds))
    .eq('role', 'child');

  if (friendProfilesError && isMissingBirthdayCompletionColumn(friendProfilesError)) {
    ({ data: friendProfiles, error: friendProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, birthday, role')
      .in('id', Array.from(friendIds))
      .eq('role', 'child'));
  }

  if (friendProfilesError) {
    throw new Error('Impossible de charger les anniversaires de tes amis.');
  }

  return (friendProfiles ?? []).map(toChildBirthdayRecord);
}

export async function updateChildBirthday(
  accessToken: string,
  params: UpdateBirthdayParams,
): Promise<UpdateBirthdayResult> {
  if (!accessToken) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  if (!params.consent) {
    throw new Error('Le consentement parental est obligatoire.');
  }

  const normalizedBirthday = params.birthday === null ? null : normalizeBirthday(params.birthday);

  try {
    const response = await supabase.functions.invoke('update-child-birthday', {
      body: {
        birthday: normalizedBirthday,
        consent: params.consent,
        childId: params.childId,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.error) {
      throw response.error;
    }

    const payload = response.data as { birthday?: unknown; childId?: unknown };

    if (!payload || typeof payload !== 'object') {
      throw new Error('Réponse inattendue du service anniversaire.');
    }

    const childIdValue = typeof payload.childId === 'string' ? payload.childId : null;
    const birthdayValue =
      typeof payload.birthday === 'string'
        ? payload.birthday
        : payload.birthday === null
          ? null
          : undefined;

    if (!childIdValue || birthdayValue === undefined) {
      throw new Error('Réponse inattendue du service anniversaire.');
    }

    return {
      childId: childIdValue,
      birthday: birthdayValue,
    };
  } catch (error) {
    throw new Error(await mapUpdateError(error));
  }
}

// Legacy export compatibility for existing tests
export const normalizeBirthdayInput = normalizeBirthday;
export const submitBirthdayUpdate = updateChildBirthday;
