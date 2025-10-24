import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeBirthdayInput, submitBirthdayUpdate } from '../birthdayService';

declare const global: typeof globalThis & { fetch: typeof fetch };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('normalizeBirthdayInput', () => {
  it('normalise une date ISO valide', () => {
    expect(normalizeBirthdayInput('2014-03-18')).toBe('2014-03-18');
    expect(normalizeBirthdayInput('2014-3-8')).toBe('2014-03-08');
  });

  it('rejette les formats invalides', () => {
    expect(() => normalizeBirthdayInput('18/03/2014')).toThrow();
    expect(() => normalizeBirthdayInput('2014-13-01')).toThrow();
    expect(() => normalizeBirthdayInput('')).toThrow();
  });
});

describe('submitBirthdayUpdate', () => {
  it('envoie la date normalisée vers la fonction Edge', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ childId: 'child-1', birthday: '2014-03-18' }),
    } as unknown as Response;

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const result = await submitBirthdayUpdate('token', {
      birthday: '2014-3-18',
      consent: true,
      childId: 'child-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://demo.supabase.co/functions/v1/update-child-birthday',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ birthday: '2014-03-18', consent: true, childId: 'child-1' });
    expect(result).toEqual({ childId: 'child-1', birthday: '2014-03-18' });
  });
});
