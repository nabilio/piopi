import { useCallback, useEffect, useMemo, useState } from 'react';
import { Profile, supabase } from '../lib/supabase';
import { submitBirthdayUpdate } from '../lib/birthdayService';

type UseBirthdayCompletionOptions = {
  childIdOverride?: string;
};

type SubmitArgs = {
  birthday: string;
  consent: boolean;
};

export function useBirthdayCompletion(
  profile: Profile | null,
  refreshProfile: () => Promise<void>,
  options: UseBirthdayCompletionOptions = {},
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const shouldPrompt = useMemo(
    () => profile?.role === 'parent' && Boolean(options.childIdOverride) && !profile?.birthday_completed,
    [options.childIdOverride, profile?.birthday_completed, profile?.role],
  );

  useEffect(() => {
    if (!shouldPrompt) {
      setIsModalOpen(false);
    }
  }, [shouldPrompt]);

  const submitBirthday = useCallback(async ({ birthday, consent }: SubmitArgs) => {
    if (!profile?.id) {
      throw new Error('Profil utilisateur introuvable');
    }

    if (!consent) {
      setError('Le consentement parental est obligatoire.');
      return;
    }

    if (profile.role === 'child' && !options.childIdOverride) {
      setError('Seuls les parents peuvent enregistrer la date d\'anniversaire.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }

      const targetChildId = profile.role === 'parent'
        ? options.childIdOverride
        : profile.id;

      if (profile.role === 'parent' && !targetChildId) {
        setError('Sélectionnez un enfant pour enregistrer sa date d\'anniversaire.');
        return;
      }

      await submitBirthdayUpdate(session.access_token, {
        birthday,
        consent,
        childId: targetChildId,
        sessionUserId: session.user?.id,
      });

      await refreshProfile();
      setIsModalOpen(false);
      setSuccessMessage('Anniversaire enregistré avec succès ! 🎉');
    } catch (err) {
      console.error('Birthday submission error:', err);
      setError(err instanceof Error ? err.message : 'Impossible d\'enregistrer l\'anniversaire');
    } finally {
      setLoading(false);
    }
  }, [options.childIdOverride, profile, refreshProfile]);

  const openModal = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const resetFeedback = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    shouldPrompt,
    isModalOpen,
    openModal,
    closeModal,
    submitBirthday,
    loading,
    error,
    successMessage,
    resetFeedback,
  };
}
