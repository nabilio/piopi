import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { name, age, avatar, gradeLevel, department } = await req.json();

    if (!name || !gradeLevel) {
      throw new Error('Name and gradeLevel are required');
    }

    if (!age || age < 3 || age > 18) {
      throw new Error('Age must be between 3 and 18');
    }

    const childEmail = `${user.id}_${Date.now()}@child.local`;
    const childPassword = crypto.randomUUID();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create child auth user: ' + authError?.message);
    }

    const childAge = age;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: childEmail,
        full_name: name,
        role: 'child',
        age: childAge,
        parent_id: user.id,
        grade_level: gradeLevel,
        department: department || null,
        onboarding_completed: true,
      });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create child profile: ' + profileError.message);
    }

    const { error: avatarError } = await supabase
      .from('avatars')
      .insert({
        child_id: authData.user.id,
        character_type: avatar || 'explorer',
        accessories: [],
      });

    if (avatarError) {
      console.error('Avatar creation error:', avatarError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        childId: authData.user.id,
        message: 'Child profile created successfully',
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
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});