import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type TrialConfig = {
  defaultDays: number;
  active: boolean;
  days: number;
  name?: string | null;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function formatTrialDuration(days: number) {
  if (!Number.isFinite(days) || days <= 0) {
    return '';
  }

  if (days % 30 === 0) {
    const months = Math.floor(days / 30);
    if (months <= 1) {
      return '1 mois';
    }
    return `${months} mois`;
  }

  return `${days} jours`;
}

export function useTrialConfig() {
  const [trialConfig, setTrialConfig] = useState<TrialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setTrialConfig({
        defaultDays: 30,
        active: false,
        days: 30,
      });
      setError(null);
      setLoading(false);
      return;
    }

    async function fetchTrialSettings() {
      try {
        const { data, error: settingsError } = await supabase
          .from('app_settings')
          .select(
            'default_trial_days, trial_promo_active, trial_promo_days, trial_promo_name, trial_promo_description, trial_promo_starts_at, trial_promo_ends_at'
          )
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle();

        if (settingsError) {
          throw settingsError;
        }

        if (!isMounted) {
          return;
        }

        if (data) {
          const now = new Date();
          const startsAt = data.trial_promo_starts_at ? new Date(data.trial_promo_starts_at) : null;
          const endsAt = data.trial_promo_ends_at ? new Date(data.trial_promo_ends_at) : null;
          const promoActive = Boolean(
            data.trial_promo_active &&
            (!startsAt || startsAt <= now) &&
            (!endsAt || endsAt >= now)
          );

          const defaultDays = data.default_trial_days ?? 30;
          const promoDays = data.trial_promo_days ?? defaultDays;

          setTrialConfig({
            defaultDays,
            active: promoActive,
            days: promoActive ? promoDays : defaultDays,
            name: data.trial_promo_name,
            description: data.trial_promo_description,
            startsAt: data.trial_promo_starts_at,
            endsAt: data.trial_promo_ends_at,
          });
        } else {
          setTrialConfig({
            defaultDays: 30,
            active: false,
            days: 30,
          });
        }
        setError(null);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const error = err instanceof Error ? err : new Error('Failed to load trial settings');
        console.error('Failed to load trial settings:', error);
        setError(error);
        setTrialConfig({
          defaultDays: 30,
          active: false,
          days: 30,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTrialSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const baseTrialDays = useMemo(() => {
    if (!trialConfig) {
      return 30;
    }

    return trialConfig.active ? trialConfig.days : trialConfig.defaultDays;
  }, [trialConfig]);

  const defaultTrialDays = trialConfig?.defaultDays ?? 30;

  const formattedBaseTrial = useMemo(() => formatTrialDuration(baseTrialDays), [baseTrialDays]);
  const formattedDefaultTrial = useMemo(() => formatTrialDuration(defaultTrialDays), [defaultTrialDays]);

  const promoHeadline = trialConfig?.active && trialConfig.name
    ? trialConfig.name
    : `${formattedBaseTrial} d'essai gratuit`;

  const reassuranceCopy = `Profitez de ${formattedBaseTrial} d'essai gratuit, sans engagement.`;
  const paymentReminder = "Vous ne serez facturé(e) qu'après la fin de votre période d'essai si vous continuez.";
  const securityMessage = 'Paiements 100% sécurisés via Stripe et PayPal.';

  const promoBanner = reassuranceCopy;

  const activeDescription = trialConfig?.active ? trialConfig.description : null;

  return {
    trialConfig,
    loading,
    error,
    baseTrialDays,
    defaultTrialDays,
    formattedBaseTrial,
    formattedDefaultTrial,
    promoHeadline,
    promoBanner,
    activeDescription,
    reassuranceCopy,
    paymentReminder,
    securityMessage,
  };
}
