
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Organization, User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) {
        console.warn('Auth loading timeout reached. Releasing application shell.');
        setIsLoading(false);
      }
    }, 10000);

    const finishLoading = () => {
      window.clearTimeout(loadingTimeout);
      if (isMounted) setIsLoading(false);
    };

    // 1. Verificar sessão atual
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (data?.session) {
          await fetchProfile(data.session.user.id, data.session.user.email!);
        } else {
          finishLoading();
        }
      } catch (error) {
        console.error("Auth session check failed:", error);
        finishLoading();
      }
    };

    checkSession();

    // 2. Ouvir mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(async () => {
        if (!isMounted) return;
        if (session) {
          const fullName = typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : undefined;
          await fetchProfile(session.user.id, session.user.email!, fullName);
        } else {
          setUser(null);
          finishLoading();
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrganization = async (userId: string): Promise<Organization | undefined> => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (
            id,
            name,
            slug,
            plan,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error || !data?.organizations) {
        if (error && error.code !== '42P01' && !error.message?.includes('organization_members')) {
          console.warn('Organization context not available:', error.message);
        }
        return undefined;
      }

      const organization = Array.isArray(data.organizations)
        ? data.organizations[0]
        : data.organizations;

      if (!organization) return undefined;

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || undefined,
        plan: organization.plan || 'solo',
        status: organization.status || 'active',
        role: data.role || 'member',
      };
    } catch (error) {
      console.warn('Organization context failed:', error);
      return undefined;
    }
  };

  const fetchProfile = async (userId: string, email: string, fallbackName?: string) => {
    try {
      const organization = await fetchOrganization(userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        setUser({
          id: userId,
          email: email,
          name: profile.name || email.split('@')[0],
          role: profile.role || 'user',
          company: organization?.name || profile.company_name || 'Individual',
          createdAt: new Date(profile.created_at),
          organization,
        });
      } else {
        const profileName = fallbackName || email.split('@')[0];

        // Criar perfil se não existir (primeiro login social e.x.)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: userId, name: profileName }]);

        if (!insertError) {
          setUser({
            id: userId,
            email: email,
            name: profileName,
            role: 'user',
            company: organization?.name || 'Individual',
            createdAt: new Date(),
            organization,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setIsLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error || !data.session) {
      setIsLoading(false);
      return { error, needsEmailConfirmation: !error && !data.session };
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: data.user.id, name }], { onConflict: 'id' });

      if (profileError) {
        console.error('Error saving signup profile:', profileError);
      }

      await fetchProfile(data.user.id, email, name);
    }

    return { error: null, needsEmailConfirmation: false };
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) setIsLoading(false);
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      signUp,
      signInWithProvider
    }}>
      {children}
    </AuthContext.Provider>
  );
};
