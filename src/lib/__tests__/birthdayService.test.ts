import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

import { supabase } from '../supabase';
import { normalizeBirthdayInput, submitBirthdayUpdate } from '../birthdayService';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('normalizeBirthdayInput', () => {
  it('normalise une date ISO valide', () => {
    expect(normalizeBirthdayInput('2014-03-18')).toBe('2014-03-18');
    expect(normalizeBirthdayInput('2014-03-08')).toBe('2014-03-08');
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

    const invokeSpy = vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
      data: { childId: 'child-1', birthday: '2014-03-18' },
      error: null,
    });

    const result = await submitBirthdayUpdate('token', {
      birthday: '2014-03-18',
      consent: true,
      childId: 'child-1',
    });

    expect(invokeSpy).toHaveBeenCalledWith(
      'update-child-birthday',
      expect.objectContaining({
        body: { birthday: '2014-03-18', consent: true, childId: 'child-1' },
        headers: { Authorization: 'Bearer token' },
      }),
    );
    expect(result).toEqual({ childId: 'child-1', birthday: '2014-03-18' });
  });

  it('remonte les erreurs de la fonction Edge issues du contexte', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');

    vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: { error: 'Parental consent is required' },
      },
    });

    await expect(
      submitBirthdayUpdate('token', {
        birthday: '2014-03-18',
        consent: true,
        childId: 'child-1',
      }),
    ).rejects.toThrow('Le consentement parental est obligatoire.');
  });

  it('prend en compte les erreurs encapsulées dans la réponse', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');

    vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
      data: { error: 'Child profile not found' },
      error: 'Edge Function returned a non-2xx status code.',
    });

    await expect(
      submitBirthdayUpdate('token', {
        birthday: '2014-03-18',
        consent: true,
        childId: 'child-1',
      }),
    ).rejects.toThrow('Impossible de retrouver le profil à mettre à jour. Veuillez réessayer.');
  });
});
