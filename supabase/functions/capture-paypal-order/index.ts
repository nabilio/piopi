import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type RequestBody = {
  orderId: string;
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
    const paypalBaseUrl = Deno.env.get('PAYPAL_API_BASE') ?? 'https://api-m.paypal.com';

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
    if (!body.orderId) {
      throw new Error('Missing orderId');
    }

    const accessToken = await getPaypalAccessToken(paypalBaseUrl, paypalClientId, paypalClientSecret);

    const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${body.orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      throw new Error(`PayPal capture failed: ${errorText}`);
    }

    const captureData: {
      status: string;
      purchase_units?: unknown;
      payer?: unknown;
    } = await captureResponse.json();

    return new Response(
      JSON.stringify({
        status: captureData.status,
        purchaseUnits: captureData.purchase_units,
        payer: captureData.payer,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('PayPal capture error:', error);
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
