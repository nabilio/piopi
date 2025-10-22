import { useState } from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ChildBirthdayModal } from '../components/ChildBirthdayModal';
import { BirthdayNotificationCard } from '../components/BirthdayNotificationCard';
import { useBirthdayCompletion } from '../hooks/useBirthdayCompletion';
import { supabase, Profile } from '../lib/supabase';
import { ParentBirthdays } from '../components/ParentBirthdays';
import * as birthdayService from '../lib/birthdayService';

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
      data: { session: { access_token: 'token' } },
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

  it("permet à l'enfant de saisir sa date puis au parent de gérer l'invitation", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<ChildBirthdayFlowHarness initialProfile={childProfile} />);

    expect(
      screen.getByText("Partage ta date d'anniversaire avec ton parent 🎉"),
    ).toBeInTheDocument();

    const dateInput = await screen.findByLabelText("Date d'anniversaire");
    await user.clear(dateInput);
    await user.type(dateInput, '2014-03-18');

    const consentCheckbox = screen.getByLabelText(/Je confirme/i);
    await user.click(consentCheckbox);

    await user.click(screen.getByRole('button', { name: /Valider avec mon parent/i }));

    await waitFor(() => expect(birthdayService.submitBirthdayUpdate).toHaveBeenCalled());

    await waitFor(() => {
      expect(
        screen.queryByText("Partage ta date d'anniversaire avec ton parent 🎉"),
      ).not.toBeInTheDocument();
    });

    unmount();

    const parentChildren = [
      {
        ...childProfile,
        birthday: '2014-03-18',
        birthday_completed: true,
      },
    ];

    const parentInvitations = [
      {
        id: 'invite-1',
        child_id: 'child-1',
        host_child_id: 'child-2',
        event_date: '2025-05-01',
        location: 'Maison des Lunes',
        message: 'Pique-nique magique au parc des hiboux !',
        status: 'pending' as const,
        responded_at: null,
        created_at: new Date().toISOString(),
        host_child_profile: { id: 'child-2', full_name: 'Léo' },
        child_profile: { id: 'child-1', full_name: 'Alice' },
      },
    ];

    vi.spyOn(birthdayService, 'fetchParentChildrenWithBirthdays').mockResolvedValue(parentChildren);
    vi.spyOn(birthdayService, 'fetchBirthdayInvitations').mockResolvedValue(parentInvitations);
    const respondSpy = vi
      .spyOn(birthdayService, 'respondToBirthdayInvitation')
      .mockResolvedValue();

    render(<ParentBirthdays onBack={() => {}} parentId="parent-1" />);

    expect(await screen.findByText('Gestion des anniversaires')).toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(await screen.findByText(/invite à son anniversaire/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirmer/i }));

    await waitFor(() => expect(respondSpy).toHaveBeenCalledWith('invite-1', 'accepted'));
  });
});
