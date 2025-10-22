import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authorization header present");

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

    const token = authHeader.replace("Bearer ", "");
    console.log("Getting user with token...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    console.log("User result:", user?.id, "Error:", userError);

    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: " + (userError?.message || "No user found") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("User ID:", user.id);
    console.log("Profile:", profile);
    console.log("Profile Error:", profileError);

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required. User role: " + (profile?.role || "none") }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    const userIds = authUsers.users.map(u => u.id);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const usersWithProfiles = authUsers.users.map(authUser => {
      const profile = profileMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || "N/A",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        has_profile: !!profile,
        role: profile?.role || "N/A",
        full_name: profile?.full_name || "N/A",
        grade_level: profile?.grade_level || null,
        department: profile?.department || null,
        banned: profile?.banned || false,
        email_confirmed: authUser.email_confirmed_at ? true : false,
        email_confirmed_at: authUser.email_confirmed_at || null,
      };
    });

    usersWithProfiles.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return new Response(
      JSON.stringify({ users: usersWithProfiles }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
