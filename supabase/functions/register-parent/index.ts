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

    const { email, password, fullName, selectedChildren, billingPeriod, price, promoCode, promoMonths, planId } = await req.json();

    if (!email || !password || !fullName || !planId) {
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

    const createUserResult = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        selected_children_count: selectedChildren,
        billing_period: billingPeriod,
        promo_code: promoCode || null,
      },
    });

    let authData = createUserResult.data;
    const authError = createUserResult.error;
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

    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('default_trial_days, trial_promo_active, trial_promo_days, trial_promo_starts_at, trial_promo_ends_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Failed to load app settings for trial configuration:', settingsError);
    }

    let baseTrialDays = 30;
    if (settingsData) {
      const now = new Date();
      const startsAt = settingsData.trial_promo_starts_at ? new Date(settingsData.trial_promo_starts_at) : null;
      const endsAt = settingsData.trial_promo_ends_at ? new Date(settingsData.trial_promo_ends_at) : null;
      const promoActive = Boolean(
        settingsData.trial_promo_active &&
        (!startsAt || startsAt <= now) &&
        (!endsAt || endsAt >= now)
      );

      baseTrialDays = promoActive
        ? (settingsData.trial_promo_days ?? settingsData.default_trial_days ?? 30)
        : (settingsData.default_trial_days ?? 30);
    }

    const totalTrialDays = baseTrialDays + (promoMonths || 0) * 30;

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + totalTrialDays);

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
        plan_type: planId,
        children_count: selectedChildren,
        price,
        status: 'trial',
        trial_start_date: new Date().toISOString(),
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

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        needsEmailConfirmation: false,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
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
