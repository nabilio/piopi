import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, fullName, selectedChildren, billingPeriod, price, promoCode, promoMonths } = await req.json();

    if (!email || !password || !fullName) {
      throw new Error('Missing required fields');
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      throw new Error('Un compte avec cet email existe déjà. Veuillez vous connecter.');
    }

    let authData;
    let authError;

    const createUserResult = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        selected_children_count: selectedChildren,
        billing_period: billingPeriod,
        promo_code: promoCode || null,
      },
    });

    authData = createUserResult.data;
    authError = createUserResult.error;

    if (authError) {
      if (authError.message.includes('already registered')) {
        const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);
        
        if (getUserError || !user) {
          throw new Error('Erreur lors de la récupération de l\'utilisateur existant');
        }

        const { data: existingUserProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (existingUserProfile) {
          throw new Error('Un compte avec cet email existe déjà. Veuillez vous connecter.');
        }

        authData = { user };
      } else {
        throw new Error('Failed to create user: ' + authError.message);
      }
    }

    if (!authData || !authData.user) {
      throw new Error('Failed to create user');
    }

    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 1);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'parent',
        onboarding_completed: false,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create profile: ' + profileError.message);
    }

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        parent_id: authData.user.id,
        plan_type: billingPeriod,
        children_count: selectedChildren,
        price,
        status: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        promo_code: promoCode || null,
        promo_months_remaining: promoMonths || 0,
      });

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
    }

    if (promoCode && promoMonths > 0) {
      await supabase.rpc('increment_promo_usage', { promo_code_input: promoCode });
    }

    const { data: { properties }, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: 'https://www.piopi.eu',
      },
    });

    if (linkError || !properties) {
      console.error('Failed to generate confirmation link:', linkError);
    } else {
      const confirmationLink = properties.action_link;

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
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
          const emailError = await emailResponse.json();
          console.error('Failed to send confirmation email:', emailError);
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        needsEmailConfirmation: true,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
