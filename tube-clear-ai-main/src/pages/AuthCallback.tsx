import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Check for access_token in hash (OAuth flow)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const errorParam = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

        if (errorParam) {
          setError(errorDescription || errorParam);
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        if (accessToken && refreshToken) {
          // Exchange tokens for session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError(sessionError.message);
            setTimeout(() => navigate("/"), 3000);
            return;
          }

          // Clear the URL hash
          window.history.replaceState({}, "", window.location.pathname);
          
          // Redirect to dashboard
          navigate("/dashboard");
          return;
        }

        // Check if we already have a session (from lovable auth)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/dashboard");
          return;
        }

        // No tokens found, redirect to home
        setError("No authentication tokens found. Please try signing in again.");
        setTimeout(() => navigate("/"), 3000);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred during authentication.");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Authentication Failed</h1>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <Shield className="h-16 w-16 text-primary animate-pulse" />
          <div className="absolute inset-0 animate-ping">
            <Shield className="h-16 w-16 text-primary opacity-20" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Authenticating...</h1>
        <p className="text-muted-foreground">Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
