import { supabase, Profile, BirthdayInvitation } from './supabase';

export type BirthdayResponseStatus = 'accepted' | 'declined';

export type UpcomingBirthday = {
  child: Profile;
  formattedDate: string;
  nextOccurrence: Date;
  daysUntil: number;
};

export function normalizeBirthdayInput(value: string): string {
  if (!value) {
    throw new Error('La date d\'anniversaire est requise');
  }

  const sanitized = value.trim();
  const isoMatch = sanitized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) {
    throw new Error('Format de date invalide (aaaa-mm-jj attendu)');
  }

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(utcDate.getTime())) {
    throw new Error('Date d\'anniversaire invalide');
  }

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error('Date d\'anniversaire invalide');
  }

  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
}

function mapBirthdayUpdateError(message: string): string {
  const fallbackMessage = 'Impossible d\'enregistrer l\'anniversaire';

  if (!message) {
    return fallbackMessage;
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return fallbackMessage;
  }

  const normalized = trimmedMessage.toLowerCase();
  const genericSupabaseFailures = [
    'function invocation http error',
    'function http error',
    'fonction http error',
  ];

  if (genericSupabaseFailures.some((needle) => normalized.includes(needle))) {
    return fallbackMessage;
  }

  if (trimmedMessage === 'Parental consent is required') {
    return 'Le consentement parental est obligatoire.';
  }

  if (trimmedMessage === 'Child profile not found' || trimmedMessage === 'Profile not found') {
    return 'Impossible de retrouver le profil à mettre à jour. Veuillez réessayer.';
  }

  if (trimmedMessage === 'Supabase service is not configured correctly') {
    return 'Le service anniversaire est indisponible pour le moment. Contactez un administrateur.';
  }

  if (trimmedMessage.includes('Database migration for birthday tracking is missing')) {
    return 'La base de données n\'est pas à jour pour le suivi des anniversaires. Merci de contacter un administrateur.';
  }

  if (trimmedMessage.includes('Access to the profiles table is blocked by RLS policies')) {
    return 'Accès refusé pour l\'enregistrement de l\'anniversaire. Vérifiez la configuration des permissions sur Supabase.';
  }

  if (trimmedMessage.includes('Invalid birthday format') || trimmedMessage.includes('Birthday is required')) {
    return 'La date d\'anniversaire fournie est invalide.';
  }

  return trimmedMessage;
}

export async function submitBirthdayUpdate(
  accessToken: string,
  {
    birthday,
    consent,
    childId,
  }: {
    birthday: string;
    consent: boolean;
    childId?: string;
  },
): Promise<{ childId: string; birthday: string }> {
  const normalized = normalizeBirthdayInput(birthday);

  let data: unknown = null;
  let error: unknown = null;

  try {
    const response = await supabase.functions.invoke('update-child-birthday', {
      body: {
        birthday: normalized,
        consent,
        childId,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    data = response.data;
    error = response.error;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    throw new Error(mapBirthdayUpdateError(message));
  }

  if (error) {
    const extractMessage = (candidate: unknown): string | null => {
      if (!candidate) {
        return null;
      }

      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        return trimmed === '' ? null : trimmed;
      }

      if (typeof candidate === 'object') {
        const record = candidate as Record<string, unknown>;

        if (typeof record.context === 'object' && record.context !== null) {
          const contextRecord = record.context as Record<string, unknown>;
          const contextKeys: Array<'error' | 'message'> = ['error', 'message'];
          for (const key of contextKeys) {
            const value = contextRecord[key];
            if (typeof value === 'string' && value.trim() !== '') {
              return value.trim();
            }
          }
        }

        const directKeys: Array<'error' | 'message'> = ['error', 'message'];
        for (const key of directKeys) {
          const value = record[key];
          if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
          }
        }

        if (typeof record.data === 'string') {
          try {
            const parsed = JSON.parse(record.data);
            return extractMessage(parsed);
          } catch {
            // Ignore JSON parse errors and continue with other fallbacks
          }
        }
      }

      return null;
    };

    const rawErrorMessage = extractMessage(error);
    const sanitizedErrorMessage =
      rawErrorMessage && rawErrorMessage.toLowerCase().startsWith('edge function returned a non-2xx status code')
        ? null
        : rawErrorMessage;

    const messageCandidates: Array<string | null> = [
      sanitizedErrorMessage,
      extractMessage(data),
      typeof error === 'object' && error !== null && 'name' in error && typeof (error as { name?: unknown }).name === 'string'
        ? ((error as { name?: string }).name ?? '').trim() || null
        : null,
    ];

    const finalMessage = messageCandidates.find((candidate) => candidate && candidate.trim() !== '') ?? '';

    throw new Error(mapBirthdayUpdateError(finalMessage));
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Réponse invalide du service anniversaire.');
  }

  const payload = data as { childId?: unknown; birthday?: unknown };

  if (typeof payload.childId !== 'string' || typeof payload.birthday !== 'string') {
    throw new Error('Réponse invalide du service anniversaire.');
  }

  return {
    childId: payload.childId,
    birthday: payload.birthday,
  };
}

export async function fetchParentChildrenWithBirthdays(parentId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId)
    .eq('role', 'child')
    .order('full_name');

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchBirthdayInvitations(childIds: string[]): Promise<BirthdayInvitation[]> {
  if (childIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('birthday_party_invitations')
    .select(`
      id,
      child_id,
      host_child_id,
      event_date,
      location,
      message,
      status,
      responded_at,
      created_at,
      host_child_profile:host_child_id ( id, full_name ),
      child_profile:child_id ( id, full_name )
    `)
    .in('child_id', childIds)
    .order('event_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((invitation: any) => ({
    ...invitation,
    host_child_profile: invitation.host_child_profile ?? null,
    child_profile: invitation.child_profile ?? null,
  }));
}

export async function respondToBirthdayInvitation(
  invitationId: string,
  status: BirthdayResponseStatus,
): Promise<void> {
  const { error } = await supabase
    .from('birthday_party_invitations')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (error) {
    throw error;
  }
}

export function computeUpcomingBirthdays(children: Profile[]): UpcomingBirthday[] {
  const today = new Date();

  return children
    .filter((child) => child.birthday)
    .map((child) => {
      const [, month, day] = (child.birthday as string).split('-').map(Number);
      const currentYear = today.getFullYear();
      let next = new Date(currentYear, (month ?? 1) - 1, day ?? 1);

      if (Number.isNaN(next.getTime())) {
        return null;
      }

      if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        next = new Date(currentYear + 1, (month ?? 1) - 1, day ?? 1);
      }

      const diffTime = next.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        child,
        nextOccurrence: next,
        daysUntil,
        formattedDate: next.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
        }),
      } satisfies UpcomingBirthday;
    })
    .filter((item): item is UpcomingBirthday => item !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
