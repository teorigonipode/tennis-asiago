import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/services/profiles';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  authLoading: boolean;
  profileLoading: boolean;
  profileResolved: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    setProfileResolved(false);
    setProfileError(null);
    setProfile(null);
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
      if (!p) {
        setProfileError('Profilo non trovato. Contatta l\'amministratore.');
      }
    } catch (err) {
      setProfile(null);
      setProfileError(err instanceof Error ? err.message : 'Errore nel caricamento del profilo.');
    } finally {
      setProfileLoading(false);
      setProfileResolved(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        (async () => {
          await loadProfile(data.session!.user.id);
          setAuthLoading(false);
        })();
      } else {
        setAuthLoading(false);
        setProfileResolved(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        (async () => {
          await loadProfile(newSession.user.id);
        })();
      } else {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        setProfileResolved(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
    setProfileResolved(true);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: SITE_URL ? `${SITE_URL}/aggiorna-password` : undefined,
    });
    if (error) throw error;
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    profileError,
    authLoading,
    profileLoading,
    profileResolved,
    isAdmin: profile?.role === 'admin',
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}
