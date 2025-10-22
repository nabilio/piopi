import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

function generateToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password, fullName }: RegisterRequest = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Vérifier si l'email existe déjà
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          error: "Ce compte existe déjà avec Google. Veuillez utiliser 'Se connecter avec Google' pour vous connecter.",
          isGoogleAccount: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer l'utilisateur avec email_confirmed_at = null
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Important: ne pas confirmer automatiquement
      user_metadata: {
        full_name: fullName,
        role: 'parent',
      },
    });

    if (authError) {
      if (authError.message?.includes('already registered') || authError.message?.includes('User already registered')) {
        return new Response(
          JSON.stringify({
            error: "Ce compte existe déjà avec Google. Veuillez utiliser 'Se connecter avec Google' pour vous connecter.",
            isGoogleAccount: true
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer le profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        role: 'parent',
        full_name: fullName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Supprimer l'utilisateur si le profil n'a pas pu être créé
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Générer un token de confirmation
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire dans 24h

    const { error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .insert({
        user_id: authData.user.id,
        token: token,
        email: email,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create confirmation token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construire le lien de confirmation
    const baseUrl = Deno.env.get('VITE_APP_URL') || 'https://www.piopi.eu';
    const confirmationLink = `${baseUrl}/confirm-email?token=${token}`;

    // Envoyer l'email via Resend
    const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Confirmez votre email - PioPi',
        template: 'email_confirmation',
        data: {
          parentName: fullName,
          confirmationLink: confirmationLink,
        },
      }),
    });

    if (!emailResponse.ok) {
      console.error('Email sending failed:', await emailResponse.text());
      // Ne pas échouer l'inscription si l'email ne part pas
      // L'utilisateur peut toujours demander un nouvel email
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully. Please check your email to confirm your account.",
        userId: authData.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
