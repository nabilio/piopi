import Stripe from 'npm:stripe@14.21.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PlanId = 'basic' | 'duo' | 'family' | 'premium' | 'liberte';

type PlanConfig = {
  id: PlanId;
  name: string;
  maxChildren: number;
};

const PLANS: PlanConfig[] = [
  { id: 'basic', name: 'Basique', maxChildren: 1 },
  { id: 'duo', name: 'Duo', maxChildren: 2 },
  { id: 'family', name: 'Famille', maxChildren: 3 },
  { id: 'premium', name: 'Premium', maxChildren: 4 },
  { id: 'liberte', name: 'Liberté', maxChildren: 999 },
];

const BASE_PLAN_PRICES: Record<PlanId, number> = {
  basic: 2,
  duo: 3,
  family: 5,
  premium: 6,
  liberte: 8,
};

const computePlanPrice = (plan: PlanConfig, childrenCount: number) => {
  if (plan.id === 'liberte') {
    const billedChildren = Math.max(childrenCount, 5);
    return BASE_PLAN_PRICES.liberte + Math.max(billedChildren - 5, 0) * 2;
  }

  return BASE_PLAN_PRICES[plan.id];
};

const getBillingChildrenCount = (plan: PlanConfig, actualChildrenCount: number) => {
  if (plan.id === 'liberte') {
    return Math.max(actualChildrenCount, 5);
  }

  return Math.max(plan.maxChildren, 1);
};

type RequestBody = {
  planId: PlanId;
  childrenCount: number;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables missing');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const plan = PLANS.find((p) => p.id === body.planId);

    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    const actualChildrenCount = Math.max(body.childrenCount, 1);
    const billedChildren = getBillingChildrenCount(plan, actualChildrenCount);
    const amount = computePlanPrice(plan, billedChildren);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        planId: plan.id,
        billedChildren: billedChildren.toString(),
      },
      subscription_data: {
        metadata: {
          planId: plan.id,
          billedChildren: billedChildren.toString(),
        },
        trial_period_days: body.trialPeriodDays && body.trialPeriodDays > 0 ? body.trialPeriodDays : undefined,
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(amount * 100),
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `Abonnement ${plan.name}`,
              description: `Plan ${plan.name} pour ${billedChildren} enfant(s)`,
            },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Stripe session could not be created');
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        billedChildren,
        amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Stripe checkout creation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
