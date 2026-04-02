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
    // CRITICAL FIX: Prevent race conditions in auth state
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Get initial session with error recovery
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Session retrieval error:', error.message);
        
        // Handle specific error cases
        if (error.message.includes('expired') || 
            error.message.includes('timeout') ||
            error.message.includes('Invalid')) {
          console.log('Clearing invalid/expired session...');
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    }).catch(err => {
      if (!isMounted) return;
      console.error('Session initialization failed:', err);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Clear any existing broken session first
      await supabase.auth.signOut();
      
      // Use production URL on Vercel with /auth/callback
      const baseUrl = import.meta.env.PROD 
        ? "https://tubeclear-ai.vercel.app" 
        : window.location.origin;
      
      const redirectUri = `${baseUrl}/auth/callback`;
      
      console.log('Initiating Google OAuth with redirect:', redirectUri);
      
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      
      if (error) {
        console.error('OAuth error:', error);
        throw new Error(error.message || 'OAuth authentication failed');
      }
      
      // If we reach here, redirect happened successfully
      console.log('OAuth redirect initiated');
    } catch (err) {
      console.error('Login failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Login failed: ${errorMessage}. Please check your internet connection and try again.`);
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
