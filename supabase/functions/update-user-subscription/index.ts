import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PlanType = "basic" | "duo" | "family" | "premium" | "liberte";

type UpdateUserSubscriptionRequest = {
  userId?: string;
  planType?: PlanType;
  activationEndDate?: string | null;
};

const PLAN_CONFIG: Record<PlanType, { includedChildren: number; basePrice: number }> = {
  basic: { includedChildren: 1, basePrice: 2 },
  duo: { includedChildren: 2, basePrice: 3 },
  family: { includedChildren: 3, basePrice: 5 },
  premium: { includedChildren: 4, basePrice: 6 },
  liberte: { includedChildren: 5, basePrice: 8 },
};

function computeBilledChildren(planType: PlanType, actualChildren: number | null): number {
  if (planType === "liberte") {
    const billed = Math.max(actualChildren ?? PLAN_CONFIG.liberte.includedChildren, PLAN_CONFIG.liberte.includedChildren);
    return billed;
  }

  return PLAN_CONFIG[planType]?.includedChildren ?? 1;
}

function computePrice(planType: PlanType, billedChildren: number): number {
  if (planType === "liberte") {
    const extraChildren = Math.max(0, billedChildren - PLAN_CONFIG.liberte.includedChildren);
    return PLAN_CONFIG.liberte.basePrice + extraChildren * 2;
  }

  return PLAN_CONFIG[planType]?.basePrice ?? 0;
}

function parseActivationEndDate(rawDate: string | null | undefined): Date | null {
  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid activationEndDate provided");
  }

  parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || adminProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: UpdateUserSubscriptionRequest = await req.json();
    const { userId, planType, activationEndDate } = payload;

    if (!userId || !planType) {
      return new Response(
        JSON.stringify({ error: "Missing userId or planType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!(planType in PLAN_CONFIG)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endDate = parseActivationEndDate(activationEndDate ?? null);

    const { count: actualChildren } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", userId)
      .eq("role", "child");

    const billedChildren = computeBilledChildren(planType, actualChildren ?? null);
    const price = computePrice(planType, billedChildren);
    const status = endDate && endDate.getTime() < Date.now() ? "expired" : "active";
    const endDateIso = endDate ? endDate.toISOString() : null;
    const nowIso = new Date().toISOString();

    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, subscription_start_date, trial_start_date, trial_end_date, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let subscription;

    if (existingSubscription) {
      const normalizedTrialStart = existingSubscription.trial_start_date ?? nowIso;
      const normalizedTrialEnd = existingSubscription.trial_end_date ?? nowIso;
      const normalizedSubscriptionStart = existingSubscription.subscription_start_date ?? nowIso;

      const updates: Record<string, unknown> = {
        plan_type: planType,
        subscription_end_date: endDateIso,
        status,
        children_count: billedChildren,
        price,
        updated_at: nowIso,
        subscription_start_date: normalizedSubscriptionStart,
        trial_start_date: normalizedTrialStart,
        trial_end_date: normalizedTrialEnd,
      };

      const { data: updatedSubscription, error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update(updates)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      subscription = updatedSubscription;

      await supabaseAdmin
        .from("subscription_history")
        .insert({
          user_id: userId,
          children_count: billedChildren,
          price,
          plan_type: planType,
          action_type: "updated",
          notes: "Mise à jour via le panneau admin",
        });
    } else {
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        plan_type: planType,
        subscription_start_date: nowIso,
        subscription_end_date: endDateIso,
        status,
        children_count: billedChildren,
        price,
        trial_start_date: nowIso,
        trial_end_date: nowIso,
        promo_code: null,
        promo_months_remaining: 0,
      };

      const { data: createdSubscription, error: insertError } = await supabaseAdmin
        .from("subscriptions")
        .insert(insertPayload)
        .select("*")
        .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      subscription = createdSubscription;

      await supabaseAdmin
        .from("subscription_history")
        .insert({
          user_id: userId,
          children_count: billedChildren,
          price,
          plan_type: planType,
          action_type: "created",
          notes: "Créé via le panneau admin",
        });
    }

    return new Response(
      JSON.stringify({ success: true, subscription }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("update-user-subscription error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
