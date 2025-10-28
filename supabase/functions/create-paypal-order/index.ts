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
};

async function getPaypalAccessToken(baseUrl: string, clientId: string, clientSecret: string) {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain PayPal token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const explicitPaypalBaseUrl = Deno.env.get('PAYPAL_API_BASE');
    const paypalEnvironment = (Deno.env.get('PAYPAL_ENVIRONMENT') ?? 'sandbox').toLowerCase();

    const paypalBaseUrl = explicitPaypalBaseUrl
      ?? (paypalEnvironment === 'live' || paypalEnvironment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com');

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('PayPal credentials not configured');
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

    const accessToken = await getPaypalAccessToken(paypalBaseUrl, paypalClientId, paypalClientSecret);

    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'EUR',
              value: amount.toFixed(2),
            },
            description: `Abonnement ${plan.name} pour ${billedChildren} enfant(s)`,
          },
        ],
        application_context: {
          brand_name: 'PioPi',
          user_action: 'PAY_NOW',
          return_url: body.successUrl,
          cancel_url: body.cancelUrl,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`PayPal order creation failed (${paypalBaseUrl}): ${errorText}`);
    }

    const orderData: {
      id: string;
      links?: Array<{ rel: string; href: string }>;
    } = await orderResponse.json();
    const approvalUrl = orderData.links?.find((link) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL returned by PayPal');
    }

    return new Response(
      JSON.stringify({
        approvalUrl,
        orderId: orderData.id as string,
        billedChildren,
        amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('PayPal order creation error:', error);
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
