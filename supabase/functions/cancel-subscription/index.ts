import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CancelSubscriptionRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId }: CancelSubscriptionRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
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

    // Get subscription info
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile separately
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Update subscription status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log cancellation in history
    await supabaseAdmin
      .from('subscription_history')
      .insert({
        user_id: userId,
        children_count: subscription.children_count,
        price: subscription.children_count * 2,
        plan_type: subscription.plan_type,
        action_type: 'cancelled',
        notes: 'Abonnement annulé par l\'utilisateur'
      });

    // Calculate end date
    const endDate = subscription.status === 'trial'
      ? new Date(subscription.trial_end_date)
      : subscription.subscription_end_date
        ? new Date(subscription.subscription_end_date)
        : new Date();

    // Send cancellation confirmation email
    if (profile && profile.email) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: profile.email,
          subject: 'Confirmation d\'annulation - PioPi',
          template: 'subscription_cancelled',
          data: {
            parentName: profile.full_name,
            childrenCount: subscription.children_count,
            endDate: endDate.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription cancelled successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
