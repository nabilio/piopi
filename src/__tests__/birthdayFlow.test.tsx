import { useState } from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { supabase, Profile } from '../lib/supabase';
import { ParentBirthdays } from '../components/ParentBirthdays';
import * as birthdayService from '../lib/birthdayService';
import { BirthdayNotificationCard } from '../components/BirthdayNotificationCard';
import { ChildBirthdayModal } from '../components/ChildBirthdayModal';
import { useBirthdayCompletion } from '../hooks/useBirthdayCompletion';

type HarnessProps = {
  initialProfile: Profile;
};

function ChildBirthdayFlowHarness({ initialProfile }: HarnessProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const birthdayCompletion = useBirthdayCompletion(profile, async () => {
    setProfile((previous) => ({
      ...previous,
      birthday_completed: true,
      birthday: '2014-03-18',
    }));
  });

  return (
    <div>
      {birthdayCompletion.shouldPrompt && (
        <BirthdayNotificationCard onAction={birthdayCompletion.openModal} />
      )}
      <ChildBirthdayModal
        isOpen={birthdayCompletion.isModalOpen}
        onClose={birthdayCompletion.closeModal}
        onSubmit={birthdayCompletion.submitBirthday}
        loading={birthdayCompletion.loading}
        error={birthdayCompletion.error}
        successMessage={birthdayCompletion.successMessage}
        onResetFeedback={birthdayCompletion.resetFeedback}
        defaultBirthday={profile.birthday ?? null}
      />
    </div>
  );
}

describe('Flux anniversaire enfant/parent', () => {
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
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'token', user: { id: 'parent-1' } } },
      error: null,
    });
    vi.spyOn(birthdayService, 'submitBirthdayUpdate').mockResolvedValue({
      childId: 'child-1',
      birthday: '2014-03-18',
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("permet uniquement au parent d'enregistrer la date d'anniversaire", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<ChildBirthdayFlowHarness initialProfile={childProfile} />);

    expect(screen.queryByText('Anniversaire')).not.toBeInTheDocument();

    unmount();

    const parentChildrenInitial = [
      {
        ...childProfile,
        birthday: null,
        birthday_completed: false,
      },
    ];

    const parentChildrenUpdated = [
      {
        ...childProfile,
        birthday: '2014-03-18',
        birthday_completed: true,
      },
    ];

    vi
      .spyOn(birthdayService, 'fetchParentChildrenWithBirthdays')
      .mockResolvedValueOnce(parentChildrenInitial)
      .mockResolvedValueOnce(parentChildrenUpdated);
    vi.spyOn(birthdayService, 'fetchBirthdayInvitations').mockResolvedValue([]);

    render(<ParentBirthdays onBack={() => {}} parentId="parent-1" />);

    expect(await screen.findByText('Gestion des anniversaires')).toBeInTheDocument();
    expect(await screen.findByText('Date d\'anniversaire manquante. Ajoutez-la depuis votre espace parent pour que votre enfant profite des surprises personnalisées.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ajouter la date d'anniversaire/i }));

    const dateInput = await screen.findByLabelText("Date d'anniversaire");
    await user.clear(dateInput);
    await user.type(dateInput, '2014-03-18');

    await user.click(screen.getByRole('button', { name: /Enregistrer la date/i }));

    await waitFor(() => expect(birthdayService.submitBirthdayUpdate).toHaveBeenCalled());

    expect(await screen.findByText('Anniversaire enregistré pour Alice.')).toBeInTheDocument();
  });
});
