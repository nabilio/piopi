import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'parent' | 'child', age?: number, parentId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchToChildProfile: (childId: string) => Promise<void>;
  returnToParentProfile: () => Promise<void>;
  isViewingAsChild: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingChildId, setViewingChildId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Check if we have OAuth redirect tokens in URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasOAuthTokens = hashParams.get('access_token') && hashParams.get('refresh_token');

      if (hasOAuthTokens) {
        // Mark that we're handling OAuth to prevent double auth state change handling
        localStorage.setItem('handlingOAuth', 'true');
        // Handle OAuth redirect first
        await handleEmailConfirmation();
        localStorage.removeItem('handlingOAuth');
      } else {
        // Normal initialization
        await initAuth();
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      // Skip handling if we're in the middle of OAuth flow
      if (localStorage.getItem('handlingOAuth') === 'true') {
        console.log('Skipping auth state change during OAuth handling');
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setViewingChildId(null);
        localStorage.removeItem('viewingChildId');
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const savedChildId = localStorage.getItem('viewingChildId');
        if (savedChildId) {
          loadChildProfile(savedChildId);
        } else {
          loadUserProfile(session.user.id);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      } else if (event === 'USER_UPDATED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleEmailConfirmation() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    // Si c'est un lien de récupération de mot de passe, rediriger vers /reset-password
    if (type === 'recovery' && accessToken && refreshToken) {
      console.log('Password recovery detected, redirecting to /reset-password');
      window.location.href = '/reset-password' + window.location.hash;
      return;
    }

    // Handle OAuth redirect (Google, etc.)
    if (accessToken && refreshToken) {
      try {
        console.log('OAuth redirect detected, setting session...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

        if (type === 'signup') {
          localStorage.setItem('emailJustConfirmed', 'true');
          window.location.href = '/?emailConfirmed=true';
        } else {
          // For OAuth (Google), ensure profile is loaded immediately
          console.log('OAuth session set, user:', data.user?.id);
          if (data.user) {
            setUser(data.user);
            // Load profile immediately instead of relying on auth state change
            await loadUserProfile(data.user.id);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('OAuth/Email confirmation error:', error);
        setLoading(false);
      }
    }
  }

  async function initAuth() {
    try {
      // Set timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('Auth initialization timeout - cleaning up');
        setUser(null);
        setProfile(null);
        setViewingChildId(null);
        localStorage.removeItem('viewingChildId');
        setLoading(false);
      }, 10000); // 10 seconds timeout

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      clearTimeout(timeoutId);

      if (sessionError) {
        console.error('Session error:', sessionError);
        // Clear potentially corrupted session
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const savedChildId = localStorage.getItem('viewingChildId');

      if (savedChildId) {
        await loadChildProfile(savedChildId);
      } else {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Init auth error:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('viewingChildId');
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          // New user - create profile with onboarding_completed = false
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              role: 'parent',
              full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Utilisateur',
              onboarding_completed: false,
            });

          if (insertError) throw insertError;

          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          setProfile(newProfile);
        } else {
          // User not found, sign out
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } else {
        setProfile(data);
      }

      setViewingChildId(null);
      localStorage.removeItem('viewingChildId');
    } catch (error) {
      console.error('Error loading user profile:', error);
      // On error, clear session to prevent stuck state
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setViewingChildId(null);
      localStorage.removeItem('viewingChildId');
    } finally {
      setLoading(false);
    }
  }

  async function loadChildProfile(childId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', childId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Child profile not found, clear and return to parent
        console.warn('Child profile not found, returning to parent profile');
        localStorage.removeItem('viewingChildId');
        if (user) {
          await loadUserProfile(user.id);
        }
        return;
      }

      setProfile(data);
      setViewingChildId(childId);
      localStorage.setItem('viewingChildId', childId);
    } catch (error) {
      console.error('Error loading child profile:', error);
      localStorage.removeItem('viewingChildId');
      if (user) {
        await loadUserProfile(user.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'parent' | 'child',
    age?: number,
    parentId?: string
  ) {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Un compte existe déjà avec cet email.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Erreur lors de la création du compte');

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          role,
          full_name: fullName,
          age,
          parent_id: parentId,
          onboarding_completed: role === 'child',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
    } else {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role,
          full_name: fullName,
          age,
          parent_id: parentId,
          onboarding_completed: role === 'child',
        })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
    }

    if (role === 'child') {
      const { data: existingAvatar } = await supabase
        .from('avatars')
        .select('id')
        .eq('child_id', data.user.id)
        .maybeSingle();

      if (!existingAvatar) {
        await supabase.from('avatars').insert({
          child_id: data.user.id,
          character_type: 'explorer',
          accessories: [],
        });
      }
    }

    setUser(data.user);
    await loadUserProfile(data.user.id);
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Erreur de connexion');

    // Auth state change will handle profile loading
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account', // Force account selection
        },
      },
    });

    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setViewingChildId(null);
    localStorage.removeItem('viewingChildId');
  }

  async function resetPassword(email: string) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la réinitialisation');
    }
  }

  async function refreshProfile() {
    if (!user) return;

    if (viewingChildId) {
      await loadChildProfile(viewingChildId);
    } else {
      await loadUserProfile(user.id);
    }
  }

  async function switchToChildProfile(childId: string) {
    if (!user) return;

    setLoading(true);
    await loadChildProfile(childId);
  }

  async function returnToParentProfile() {
    if (!user) return;

    setLoading(true);
    localStorage.removeItem('viewingChildId');
    await loadUserProfile(user.id);
  }

  const isViewingAsChild = viewingChildId !== null;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signInWithEmail: signIn,
      resetPassword,
      signInWithGoogle,
      signOut,
      refreshProfile,
      switchToChildProfile,
      returnToParentProfile,
      isViewingAsChild
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
