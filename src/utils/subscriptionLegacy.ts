const LEGACY_LOOKUP_STORAGE_KEY = 'legacySubscriptionLookupState';

type LegacyLookupState = 'unknown' | 'required' | 'unsupported';

let legacyLookupState: LegacyLookupState = 'unknown';

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
  try {
    const storedState = window.localStorage.getItem(LEGACY_LOOKUP_STORAGE_KEY) as LegacyLookupState | null;
    if (storedState === 'required' || storedState === 'unsupported') {
      legacyLookupState = storedState;
    }
  } catch (storageError) {
    console.error('Failed to read legacy subscription lookup state:', storageError);
  }
}

function persistLegacyLookupState(state: LegacyLookupState) {
  legacyLookupState = state;
  if (!isBrowser) {
    return;
  }

  try {
    if (state === 'unknown') {
      window.localStorage.removeItem(LEGACY_LOOKUP_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(LEGACY_LOOKUP_STORAGE_KEY, state);
  } catch (storageError) {
    console.error('Failed to persist legacy subscription lookup state:', storageError);
  }
}

export function isMissingColumnError(candidate: unknown, columnName?: string): candidate is { code?: string; message?: string } {
  if (typeof candidate !== 'object' || candidate === null || !('code' in candidate)) {
    return false;
  }

  const { code, message } = candidate as { code?: string; message?: string };
  if (code !== '42703') {
    return false;
  }

  if (!columnName || typeof message !== 'string') {
    return true;
  }

  return message.includes(columnName);
}

export function shouldAttemptLegacySubscriptionLookup(error?: unknown): boolean {
  if (legacyLookupState === 'unsupported') {
    return false;
  }

  if (legacyLookupState === 'required') {
    return true;
  }

  if (error && isMissingColumnError(error, 'subscriptions.user_id')) {
    persistLegacyLookupState('required');
    return true;
  }

  return false;
}

export function recordLegacySubscriptionLookupSuccess() {
  if (legacyLookupState !== 'required') {
    persistLegacyLookupState('required');
  }
}

export function recordLegacySubscriptionLookupFailure(error: unknown) {
  if (isMissingColumnError(error, 'subscriptions.parent_id')) {
    persistLegacyLookupState('unsupported');
  }
}

export function markLegacySubscriptionLookupUnsupported() {
  if (legacyLookupState !== 'unsupported') {
    persistLegacyLookupState('unsupported');
  }
}

export function resetLegacySubscriptionLookupState() {
  persistLegacyLookupState('unknown');
}
