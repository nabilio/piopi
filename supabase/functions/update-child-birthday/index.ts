import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

type Role = 'parent' | 'child' | 'admin';

type ProfileRecord = {
  id: string;
  role: Role;
  parent_id: string | null;
};

type RequestBody = {
  birthday?: string | null;
  consent?: boolean;
  childId?: string;
};


function normalizeBirthday(value: string): string {
  if (!value) {
    throw new Error('Birthday is required');
  }

  const sanitized = value.trim();
  const match = sanitized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Invalid birthday format');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid birthday format');
  }

  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new Error('Invalid birthday format');
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isMissingBirthdayCompletionColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: unknown; details?: unknown; code?: unknown };
  const message =
    (typeof candidate.message === 'string' && candidate.message) ||
    (typeof candidate.details === 'string' && candidate.details) ||
    '';

  const code =
    typeof candidate.code === 'string'
      ? candidate.code.trim()
      : typeof candidate.code === 'number'
        ? String(candidate.code)
        : '';

  if (code === '42703' || code === 'PGRST204') {
    return true;
  }

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  if (!normalized.includes('birthday_completed')) {
    return false;
  }

  return normalized.includes('does not exist') || normalized.includes('schema cache');
}

const denoServe: Deno.ServeHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service is not configured correctly');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    const { birthday, consent, childId } = body;

    if (!consent) {
      throw new Error('Parental consent is required');
    }

    const normalizedBirthday =
      birthday === null || birthday === undefined || birthday === ''
        ? null
        : normalizeBirthday(birthday);

    const { data: requesterProfileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, parent_id')
      .eq('id', user.id)
      .maybeSingle();

    const requesterProfile = requesterProfileData as ProfileRecord | null;

    if (profileError || !requesterProfile) {
      throw new Error('Profile not found');
    }

    let targetChildId = requesterProfile.id;

    if (requesterProfile.role === 'parent') {
      if (!childId) {
        throw new Error('childId is required for parent accounts');
      }

      const { data: childProfileData, error: childError } = await supabase
        .from('profiles')
        .select('id, role, parent_id')
        .eq('id', childId)
        .maybeSingle();

      const childProfile = childProfileData as ProfileRecord | null;

      if (childError || !childProfile || childProfile.role !== 'child') {
        throw new Error('Child profile not found');
      }

      if (childProfile.parent_id !== requesterProfile.id) {
        throw new Error('Forbidden');
      }

      targetChildId = childProfile.id;
    } else if (requesterProfile.role !== 'child') {
      throw new Error('Unsupported role');
    } else if (childId && childId !== requesterProfile.id) {
      throw new Error('Cannot update another child profile');
    }

    const updatePayload: Record<string, unknown> = { birthday: normalizedBirthday };

    const { error: birthdayUpdateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetChildId);

    if (birthdayUpdateError) {
      const message = typeof birthdayUpdateError.message === 'string'
        ? birthdayUpdateError.message
        : 'Failed to update birthday';
      const code = 'code' in birthdayUpdateError ? String(birthdayUpdateError.code) : undefined;
      const error = new Error(message);
      if (code) {
        (error as Error & { code?: string }).code = code;
      }
      throw error;
    }

    const completionValue = normalizedBirthday ? true : false;

    const { error: completionUpdateError } = await supabase
      .from('profiles')
      .update({ birthday_completed: completionValue })
      .eq('id', targetChildId);

    if (completionUpdateError && !isMissingBirthdayCompletionColumn(completionUpdateError)) {
      const message = typeof completionUpdateError.message === 'string'
        ? completionUpdateError.message
        : 'Failed to update birthday';
      const code = 'code' in completionUpdateError ? String(completionUpdateError.code) : undefined;
      const error = new Error(message);
      if (code) {
        (error as Error & { code?: string }).code = code;
      }
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        childId: targetChildId,
        birthday: normalizedBirthday,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('update-child-birthday error:', error);

    let message: string;
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message || 'Unexpected error';
      code = (error as Error & { code?: string }).code;
    } else if (error && typeof error === 'object') {
      const candidate = error as { message?: unknown; code?: unknown };
      message = typeof candidate.message === 'string' && candidate.message.trim() !== ''
        ? candidate.message
        : 'Unexpected error';
      code = typeof candidate.code === 'string' ? candidate.code : undefined;
    } else if (typeof error === 'string' && error.trim() !== '') {
      message = error;
    } else {
      message = 'Unexpected error';
    }

    if (message.includes('birthday_completed')) {
      message = 'Database migration for birthday tracking is missing. Please apply the latest migrations.';
    } else if (message.includes('row-level security') || code === '42501') {
      message = 'Access to the profiles table is blocked by RLS policies. Please review your Supabase security configuration.';
    } else if (message === 'Supabase service is not configured correctly') {
      message = 'Service configuration error: missing Supabase credentials in the Edge Function environment.';
    }

    const status = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 400;

    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
};

Deno.serve(denoServe);
