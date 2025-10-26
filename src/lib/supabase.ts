import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Supabase configuration is missing. Please check your .env file and restart the dev server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ecole-magique-auth',
    storage: window.localStorage
  }
});

export type Profile = {
  id: string;
  email: string | null;
  role: 'parent' | 'child' | 'admin';
  full_name: string;
  age?: number;
  parent_id?: string;
  username?: string;
  grade_level?: string;
  department?: string;
  school_name?: string;
  onboarding_completed?: boolean;
  avatar_url?: string;
  birthday?: string | null;
  banned?: boolean;
  birthday_completed?: boolean;
  created_at: string;
};

export type Avatar = {
  id: string;
  child_id: string;
  character_type: string;
  accessories: string[];
  updated_at: string;
};

export type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  grade_levels?: string[];
};

export type Activity = {
  id: string;
  subject_id: string;
  chapter_id?: string;
  title: string;
  type: 'quiz' | 'game' | 'reading' | 'challenge';
  difficulty: number;
  content: any;
  points: number;
  grade_level?: string;
};

export type Progress = {
  id: string;
  child_id: string;
  activity_id: string;
  completed: boolean;
  score: number;
  time_spent: number;
  completed_at: string;
};

export type Achievement = {
  id: string;
  child_id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
};

export type CoachConversation = {
  id: string;
  child_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  subject?: string;
  created_at: string;
  updated_at: string;
};


export type BirthdayInvitation = {
  id: string;
  child_id: string;
  host_child_id: string;
  event_date: string;
  location?: string | null;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  responded_at?: string | null;
  created_at: string;
  host_child_profile?: Pick<Profile, 'id' | 'full_name'> | null;
  child_profile?: Pick<Profile, 'id' | 'full_name'> | null;
};
