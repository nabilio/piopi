import { supabase } from '../lib/supabase';

export type PlanId = 'basic' | 'duo' | 'family' | 'premium' | 'liberte';

type CreatePaymentOptions = {
  planId: PlanId;
  childrenCount: number;
  successUrl: string;
  cancelUrl: string;
};

type StripeCheckoutResponse = {
  url: string;
  sessionId: string;
  billedChildren: number;
  amount: number;
  trialPeriodDays: number;
};

type StripeVerificationResponse = {
  status: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionMetadata: Record<string, string> | null;
  trialEndDate: string | null;
};

async function getAuthHeaders() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error('Utilisateur non authentifié');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

function getFunctionUrl(name: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
}

export async function createStripeCheckout(options: CreatePaymentOptions): Promise<StripeCheckoutResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(getFunctionUrl('create-stripe-checkout'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Impossible de créer la session Stripe');
  }

  return response.json();
}

export async function verifyStripeCheckout(sessionId: string): Promise<StripeVerificationResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(getFunctionUrl('verify-stripe-session'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Impossible de vérifier le paiement Stripe');
  }

  return response.json();
}

