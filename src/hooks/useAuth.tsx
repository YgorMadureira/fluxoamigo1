import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  company_id: string;
  company_name: string;
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, company_id, full_name, role, companies(name)')
      .eq('id', userId)
      .maybeSingle() as {
        data: {
          id: string;
          company_id: string | null;
          full_name: string | null;
          role: string | null;
          companies: { name: string } | null;
        } | null;
        error: unknown;
      };

    if (error) {
      console.error('[useAuth] fetchProfile error:', error);
      return null;
    }

    if (!data || !data.company_id) {
      console.warn('[useAuth] profile not found or company_id null for user:', userId);
      return null;
    }

    return {
      id: data.id,
      company_id: data.company_id,
      company_name: data.companies?.name ?? 'Empresa',
      full_name: data.full_name ?? null,
      role: data.role ?? 'user',
    };
  } catch (err) {
    console.error('[useAuth] fetchProfile unexpected error:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          setTimeout(async () => {
            const p = await fetchProfile(newSession.user.id);
            if (!p) {
              // Don't auto sign out — let user see unauthorized message
              setProfile(null);
            } else {
              setProfile(p);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    if (!initialized.current) {
      initialized.current = true;
      supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
        if (!existingSession) {
          setLoading(false);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
