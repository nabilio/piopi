import '@testing-library/jest-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChildBirthdaysPage } from '../components/ChildBirthdaysPage';
import { ParentBirthdays } from '../components/ParentBirthdays';
import { supabase } from '../lib/supabase';
import * as birthdayService from '../lib/birthdayService';

describe('Refonte de la fonctionnalité anniversaire', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key');
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'token' } as any },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("affiche un rappel pour l'enfant et les anniversaires de ses amis", async () => {
    vi.spyOn(birthdayService, 'fetchChildBirthday').mockResolvedValue({
      id: 'child-1',
      fullName: 'Alice',
      birthday: null,
      birthdayCompleted: false,
    });

    vi.spyOn(birthdayService, 'fetchChildFriendBirthdays').mockResolvedValue([
      {
        id: 'friend-1',
        fullName: 'Bob',
        birthday: '2014-04-10',
        birthdayCompleted: true,
      },
      {
        id: 'friend-2',
        fullName: 'Charlie',
        birthday: null,
        birthdayCompleted: false,
      },
    ]);

    render(
      <ChildBirthdaysPage
        childId="child-1"
        onBack={() => {}}
      />,
    );

    expect(await screen.findByText(/Demande à ton parent/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Rappelle-lui de se connecter à son espace/i),
    ).toBeInTheDocument();

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/Anniversaire le/)).toBeInTheDocument();
    expect(screen.getByText(/Anniversaire encore tenu secret/i)).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /Enregistrer ma date/i }),
    ).not.toBeInTheDocument();
  });

  it("permet au parent d'enregistrer l'anniversaire de son enfant", async () => {
    vi.spyOn(birthdayService, 'fetchParentChildBirthdays').mockResolvedValue([
      {
        id: 'child-1',
        fullName: 'Alice',
        birthday: null,
        birthdayCompleted: false,
      },
    ]);

    const updateSpy = vi
      .spyOn(birthdayService, 'updateChildBirthday')
      .mockResolvedValue({ childId: 'child-1', birthday: '2014-03-18' });

    const user = userEvent.setup();

    render(
      <ParentBirthdays
        parentId="parent-1"
        onBack={() => {}}
      />,
    );

    expect(await screen.findByText('Alice')).toBeInTheDocument();

    const dateInput = screen.getByLabelText("Date d'anniversaire");
    await user.type(dateInput, '2014-03-18');

    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('token', {
        birthday: '2014-03-18',
        consent: true,
        childId: 'child-1',
      }),
    );

    expect(
      await screen.findByText(/Date d'anniversaire enregistrée/i),
    ).toBeInTheDocument();
  });

  it("permet au parent de supprimer l'anniversaire de son enfant", async () => {
    vi.spyOn(birthdayService, 'fetchParentChildBirthdays').mockResolvedValue([
      {
        id: 'child-1',
        fullName: 'Alice',
        birthday: '2014-03-18',
        birthdayCompleted: true,
      },
    ]);

    const updateSpy = vi
      .spyOn(birthdayService, 'updateChildBirthday')
      .mockResolvedValueOnce({ childId: 'child-1', birthday: null });

    const user = userEvent.setup();

    render(
      <ParentBirthdays
        parentId="parent-1"
        onBack={() => {}}
      />,
    );

    expect(await screen.findByText('Alice')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Supprimer la date/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('token', {
        birthday: null,
        consent: true,
        childId: 'child-1',
      }),
    );

    expect(
      await screen.findByText(/Date d'anniversaire supprimée/i),
    ).toBeInTheDocument();
  });
});
