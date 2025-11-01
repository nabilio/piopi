export type SubscriptionModalState<TUser = unknown> = {
  isOpen: boolean;
  loading: boolean;
  saving: boolean;
  user: TUser | null;
  planType: string;
  activationEndDate: string;
  status: string;
  error: string | null;
  success: string | null;
};

export const ADMIN_SUBSCRIPTION_PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: 'basic', label: 'Basique • 1 enfant' },
  { value: 'duo', label: 'Duo • 2 enfants' },
  { value: 'family', label: 'Famille • 3 enfants' },
  { value: 'premium', label: 'Premium • 4 enfants' },
  { value: 'liberte', label: 'Liberté • 5+ enfants' },
];

export function createSubscriptionModalState<TUser = unknown>(): SubscriptionModalState<TUser> {
  return {
    isOpen: false,
    loading: false,
    saving: false,
    user: null,
    planType: 'basic',
    activationEndDate: '',
    status: 'inactive',
    error: null,
    success: null,
  };
}
