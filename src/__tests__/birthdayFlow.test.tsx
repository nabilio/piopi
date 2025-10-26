import '@testing-library/jest-dom';
import { cleanup, render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ChildBirthdaysPage } from '../components/ChildBirthdaysPage';
import { ParentBirthdays } from '../components/ParentBirthdays';
import { supabase, Profile } from '../lib/supabase';
import * as birthdayService from '../lib/birthdayService';

let childBirthdayLoader: ((birthday: string | null) => void) | null = null;

vi.mock('../components/BirthdayCard', () => ({
  __esModule: true,
  BirthdayCard: (props: any) => {
    childBirthdayLoader = props.onChildBirthdayLoaded ?? null;
    return <div data-testid="birthday-card" />;
  },
}));

describe('Gestion des anniversaires', () => {
  const childProfile: Profile = {
    id: 'child-1',
    email: 'child@example.com',
    role: 'child',
    full_name: 'Alice',
    created_at: new Date().toISOString(),
    birthday: null,
    birthday_completed: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-10T00:00:00.000Z'));
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'token' } as any },
      error: null,
    });
    vi.spyOn(birthdayService, 'fetchParentChildrenWithBirthdays').mockResolvedValue([]);
    vi.spyOn(birthdayService, 'fetchBirthdayInvitations').mockResolvedValue([]);
    childBirthdayLoader = null;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    childBirthdayLoader = null;
  });

  it('affiche les messages adaptés sur la page anniversaire enfant', () => {
    render(<ChildBirthdaysPage childId="child-1" onBack={() => {}} />);

    expect(screen.getByText(/Nous préparons ta surprise/i)).toBeInTheDocument();

    act(() => {
      childBirthdayLoader?.(null);
    });

    expect(
      screen.getByText(/Invite ton parent à ajouter ta date d'anniversaire/i),
    ).toBeInTheDocument();

    act(() => {
      childBirthdayLoader?.('2014-03-18');
    });

    expect(
      screen.getByText(/Ton jour d'anniversaire est le 18\/03\/2014 \(dans 8 jours\)/i),
    ).toBeInTheDocument();
  });

  it("permet au parent d'enregistrer la date d'anniversaire de son enfant", async () => {
    const user = userEvent.setup();

    const parentChildren: Profile[] = [
      {
        ...childProfile,
      },
    ];

    vi.spyOn(birthdayService, 'fetchParentChildrenWithBirthdays').mockResolvedValue(parentChildren);
    const submitSpy = vi
      .spyOn(birthdayService, 'submitBirthdayUpdate')
      .mockResolvedValue({ childId: 'child-1', birthday: '2014-03-18' });

    render(<ParentBirthdays onBack={() => {}} parentId="parent-1" />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();

    const dateInput = await screen.findByLabelText("Date d'anniversaire pour Alice");
    await user.clear(dateInput);
    await user.type(dateInput, '2014-03-18');

    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() =>
      expect(submitSpy).toHaveBeenCalledWith('token', {
        birthday: '2014-03-18',
        consent: true,
        childId: 'child-1',
      }),
    );

    expect(
      await screen.findByText(/Date d'anniversaire enregistrée avec succès/i),
    ).toBeInTheDocument();
  });
});
