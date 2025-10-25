import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: { getSession: vi.fn() },
    },
  };
});

import { normalizeBirthdayInput, submitBirthdayUpdate } from '../birthdayService';
import { supabase } from '../supabase';

declare const global: typeof globalThis & { fetch: typeof fetch };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('normalizeBirthdayInput', () => {
  it('normalise une date ISO valide', () => {
    expect(normalizeBirthdayInput('2014-03-18')).toBe('2014-03-18');
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
      birthday: '2014-03-18',
      consent: true,
      childId: 'child-1',
      sessionUserId: 'child-1',
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

  it('bascule sur une mise à jour directe quand la fonction edge retourne une erreur inattendue', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');

    const responsePayload = { error: 'Unexpected error' };
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue(responsePayload),
    } as unknown as Response;

    vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

    const result = await submitBirthdayUpdate('token', {
      birthday: '2014-03-18',
      consent: true,
      childId: 'child-1',
      sessionUserId: 'child-1',
    });

    expect(eqMock).toHaveBeenCalledWith('id', 'child-1');
    expect(result).toEqual({ childId: 'child-1', birthday: '2014-03-18' });
  });

  it('renvoie une erreur claire si la mise à jour de secours échoue', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');

    const responsePayload = { error: 'Unexpected error' };
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue(responsePayload),
    } as unknown as Response;

    vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'row-level security violation' } });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

    await expect(submitBirthdayUpdate('token', {
      birthday: '2014-03-18',
      consent: true,
      childId: 'child-1',
      sessionUserId: 'child-1',
    })).rejects.toThrow('Accès refusé pour l\'enregistrement de l\'anniversaire. Vérifiez la configuration des permissions sur Supabase.');
  });
});
