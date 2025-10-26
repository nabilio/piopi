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

  it("permet à un enfant d'enregistrer sa date d'anniversaire", async () => {
    vi.spyOn(birthdayService, 'fetchChildBirthday').mockResolvedValue({
      id: 'child-1',
      fullName: 'Alice',
      birthday: null,
      birthdayCompleted: false,
    });

    const updateSpy = vi
      .spyOn(birthdayService, 'updateChildBirthday')
      .mockResolvedValue({ childId: 'child-1', birthday: '2014-03-18' });

    const user = userEvent.setup();

    render(
      <ChildBirthdaysPage
        childId="child-1"
        onBack={() => {}}
      />,
    );

    expect(await screen.findByText(/Demande à ton parent/i)).toBeInTheDocument();

    const dateInput = screen.getByLabelText("Date d'anniversaire");
    await user.type(dateInput, '2014-03-18');

    await user.click(
      screen.getByRole('checkbox', {
        name: /Je confirme que mon parent ou responsable légal est d'accord/i,
      }),
    );

    await user.click(screen.getByRole('button', { name: /Enregistrer ma date/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('token', {
        birthday: '2014-03-18',
        consent: true,
        childId: 'child-1',
      }),
    );

    expect(
      await screen.findByText(/Anniversaire enregistré avec succès/i),
    ).toBeInTheDocument();
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
});
