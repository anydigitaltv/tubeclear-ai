import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval error:', error.message);
        
        // Handle expired sessions
        if (error.message.includes('expired') || error.message.includes('timeout')) {
          console.log('Clearing expired session...');
          supabase.auth.signOut();
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Use production URL on Vercel with /auth/callback, otherwise use current origin
      const baseUrl = import.meta.env.PROD 
        ? "https://tubeclear-ai.vercel.app" 
        : window.location.origin;
      
      const redirectUri = `${baseUrl}/auth/callback`;
      
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      
      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed. Please check your internet connection and try again.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest: !user, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
