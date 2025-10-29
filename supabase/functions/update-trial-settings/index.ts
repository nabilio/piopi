import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type TrialSettingsPayload = {
  defaultTrialDays: number;
  promo: {
    active: boolean;
    days: number | null;
    name: string | null;
    description: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}) {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');

  if (init.headers) {
    const incomingHeaders = new Headers(init.headers);
    incomingHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const { headers: _ignored, ...rest } = init;

  return new Response(JSON.stringify(body), {
    ...rest,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Supabase configuration missing on server' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();

    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Erreur récupération profil admin:', profileError);
      return jsonResponse({ error: 'Impossible de vérifier le rôle utilisateur' }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Accès refusé' }, { status: 403 });
    }

    const payload = (await req.json()) as TrialSettingsPayload | null;

    if (!payload || typeof payload.defaultTrialDays !== 'number' || payload.defaultTrialDays <= 0 || !payload.promo) {
      return jsonResponse({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const updates = {
      default_trial_days: Math.round(payload.defaultTrialDays),
      trial_promo_active: payload.promo.active,
      trial_promo_days:
        payload.promo.active && payload.promo.days != null
          ? Math.max(0, Math.round(payload.promo.days))
          : null,
      trial_promo_name: payload.promo.active ? payload.promo.name : null,
      trial_promo_description: payload.promo.active ? payload.promo.description : null,
      trial_promo_starts_at: payload.promo.active ? payload.promo.startsAt : null,
      trial_promo_ends_at: payload.promo.active ? payload.promo.endsAt : null,
      updated_at: new Date().toISOString(),
    };

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error: updateError } = await serviceClient
      .from('app_settings')
      .update(updates)
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) {
      console.error('Erreur mise à jour paramètres essai (edge):', updateError);
      return jsonResponse({ error: 'Mise à jour impossible' }, { status: 500 });
    }

    return jsonResponse({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erreur inattendue update-trial-settings:', error);
    return jsonResponse({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
});
