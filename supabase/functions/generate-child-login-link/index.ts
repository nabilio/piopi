import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

type GenerateLinkPayload = {
  childId?: string;
  redirectTo?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase credentials are not configured.');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new Error('Unauthorized');
    }

    const payload = (await req.json()) as GenerateLinkPayload;
    if (!payload.childId) {
      throw new Error('childId is required');
    }

    const { data: childProfile, error: childError } = await supabase
      .from('profiles')
      .select('id, parent_id, email, full_name, role')
      .eq('id', payload.childId)
      .maybeSingle();

    if (childError) {
      console.error('Error fetching child profile:', childError);
      throw new Error("Impossible de récupérer le profil de l'enfant.");
    }

    if (!childProfile || childProfile.role !== 'child') {
      throw new Error("Profil enfant introuvable.");
    }

    if (childProfile.parent_id !== authData.user.id) {
      throw new Error('Access denied for this child profile.');
    }

    let childEmail = childProfile.email;

    if (!childEmail) {
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(childProfile.id);

      if (authUserError || !authUserData?.user?.email) {
        console.error('Error fetching child auth user:', authUserError);
        throw new Error("Ce profil enfant ne possède pas d'email de connexion. Contactez le support.");
      }

      childEmail = authUserData.user.email;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email: childEmail })
        .eq('id', childProfile.id);

      if (updateError) {
        console.error('Error syncing child email to profile:', updateError);
      }
    }

    if (!childEmail) {
      throw new Error("Ce profil enfant ne possède pas d'email de connexion.");
    }

    const defaultRedirect = `${new URL(req.url).origin}/child-qr-login`;
    const redirectTo = payload.redirectTo || Deno.env.get('VITE_APP_URL') || defaultRedirect;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: childEmail,
      options: {
        redirectTo
      }
    });

    if (linkError) {
      console.error('Error generating login link:', linkError);
      throw new Error("Impossible de générer le lien de connexion.");
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      throw new Error('No action link returned by Supabase.');
    }

    return new Response(
      JSON.stringify({
        loginLink: actionLink,
        expiresAt: linkData?.properties?.expires_at ?? null,
        childName: childProfile.full_name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('generate-child-login-link error:', error);
    const message = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
