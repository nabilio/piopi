import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
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

    // Trouver l'utilisateur par email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      throw userError;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier si l'email est déjà confirmé
    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ message: "Email already confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer le profil pour le nom
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Invalider les anciens tokens
    await supabaseAdmin
      .from('email_confirmation_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('confirmed_at', null);

    // Créer un nouveau token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .insert({
        user_id: user.id,
        token: token,
        email: email,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      throw tokenError;
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
          parentName: profile?.full_name || '',
          confirmationLink: confirmationLink,
        },
      }),
    });

    if (!emailResponse.ok) {
      console.error('Email sending failed:', await emailResponse.text());
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Resend email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
