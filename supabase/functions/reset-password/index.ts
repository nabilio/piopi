import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
        JSON.stringify({ success: false, error: "Email requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      throw new Error("Erreur lors de la recherche de l'utilisateur");
    }

    const user = userData.users.find(u => u.email === email);

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({
          success: true,
          message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate password reset token using Supabase Auth
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://www.piopi.eu';
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      }
    });

    if (resetError) {
      throw new Error("Erreur lors de la génération du lien de réinitialisation");
    }

    const resetLink = resetData.properties?.action_link || '';

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurée");
    }

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: 'Réinitialisation de votre mot de passe PioPi',
        template: 'password_reset',
        data: {
          resetLink: resetLink,
        }
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.error || "Erreur lors de l'envoi de l'email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Un email de réinitialisation a été envoyé à votre adresse."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in reset-password:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Une erreur est survenue"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
