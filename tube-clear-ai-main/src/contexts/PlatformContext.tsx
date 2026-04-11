import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlatformId = "youtube" | "tiktok" | "instagram" | "facebook" | "dailymotion";

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  isPrimary: boolean;
  accountName?: string;
}

interface ConnectedPlatformRow {
  id: string;
  user_id: string;
  platform_id: PlatformId;
  account_name: string;
  channel_url?: string;
  is_primary: boolean;
  created_at: string;
}

interface PlatformContextType {
  platforms: Platform[];
  primaryPlatform: Platform | null;
  connectPlatform: (platformId: PlatformId, accountName: string) => Promise<{ success: boolean; error?: string }>;
  disconnectPlatform: (platformId: PlatformId) => Promise<{ success: boolean; error?: string }>;
  getConnectedCount: () => number;
  isLoading: boolean;
}

const STORAGE_KEY = "tubeclear_platforms";

const DEFAULT_PLATFORMS: Platform[] = [
  { id: "youtube", name: "YouTube", icon: "Youtube", color: "#FF0000", connected: false, isPrimary: false },
  { id: "tiktok", name: "TikTok", icon: "Music2", color: "#000000", connected: false, isPrimary: false },
  { id: "instagram", name: "Instagram", icon: "Instagram", color: "#E4405F", connected: false, isPrimary: false },
  { id: "facebook", name: "Facebook", icon: "Facebook", color: "#1877F2", connected: false, isPrimary: false },
  { id: "dailymotion", name: "Dailymotion", icon: "PlayCircle", color: "#00D2F3", connected: false, isPrimary: false },
];

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [isLoading, setIsLoading] = useState(false);

  // Load platforms from localStorage (for guests) or Supabase (for authenticated users)
  useEffect(() => {
    const loadPlatforms = async () => {
      setIsLoading(true);
      
      if (isGuest || !user) {
        // Load from localStorage for guests
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setPlatforms(DEFAULT_PLATFORMS.map(p => {
              const saved = parsed.find((s: Platform) => s.id === p.id);
              return saved ? { ...p, ...saved } : p;
            }));
          } else {
            setPlatforms(DEFAULT_PLATFORMS);
          }
        } catch {
          setPlatforms(DEFAULT_PLATFORMS);
        }
      } else {
        // Load from Supabase for authenticated users
        try {
          const { data, error } = await supabase
            .from("connected_platforms")
            .select("*")
            .eq("user_id", user.id);

          if (!error && data) {
            const connectedPlatforms = data as ConnectedPlatformRow[];
            setPlatforms(DEFAULT_PLATFORMS.map(p => {
              const connected = connectedPlatforms.find(c => c.platform_id === p.id);
              return connected 
                ? { ...p, connected: true, isPrimary: connected.is_primary, accountName: connected.account_name }
                : p;
            }));
          }
        } catch (error) {
          console.error("Error loading platforms from Supabase:", error);
          // Fall back to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setPlatforms(DEFAULT_PLATFORMS.map(p => {
              const saved = parsed.find((s: Platform) => s.id === p.id);
              return saved ? { ...p, ...saved } : p;
            }));
          }
        }
      }
      
      setIsLoading(false);
    };

    loadPlatforms();
  }, [user, isGuest]);

  // Save to localStorage whenever platforms change (for guests)
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
    }
  }, [platforms, isGuest]);

  const primaryPlatform = platforms.find(p => p.isPrimary) || null;

  const connectPlatform = useCallback(async (platformId: PlatformId, accountName: string): Promise<{ success: boolean; error?: string }> => {
    const hasPrimary = platforms.some(p => p.isPrimary);
    const willBePrimary = !hasPrimary;

    // Optimistic update
    setPlatforms(prev => prev.map(p => {
      if (p.id === platformId) {
        return { ...p, connected: true, isPrimary: willBePrimary, accountName };
      }
      return p;
    }));

    // If authenticated, sync with Supabase
    if (!isGuest && user) {
      try {
        const { error } = await supabase
          .from("connected_platforms")
          .upsert({
            user_id: user.id,
            platform_id: platformId,
            account_name: accountName,
            channel_url: accountName.startsWith('http') ? accountName : `https://${accountName}`,
            is_primary: willBePrimary,
          }, {
            onConflict: "user_id,platform_id"
          });

        if (error) {
          console.error("Supabase connection error:", error);
          // Revert on error
          setPlatforms(prev => prev.map(p => {
            if (p.id === platformId) {
              return { ...p, connected: false, isPrimary: false, accountName: undefined };
            }
            return p;
          }));
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.error("Platform connection failed:", err);
        // Revert on error
        setPlatforms(prev => prev.map(p => {
          if (p.id === platformId) {
            return { ...p, connected: false, isPrimary: false, accountName: undefined };
          }
          return p;
        }));
        return { success: false, error: "Failed to connect platform" };
      }
    }

    // Trigger video sync after successful connection
    window.dispatchEvent(new CustomEvent('platform-connected', { 
      detail: { platformId, accountName } 
    }));

    return { success: true };
  }, [platforms, isGuest, user]);

  const disconnectPlatform = useCallback(async (platformId: PlatformId): Promise<{ success: boolean; error?: string }> => {
    const wasPrimary = platforms.find(p => p.id === platformId)?.isPrimary;

    // Optimistic update
    const optimisticUpdate = (prev: Platform[]) => {
      const updated = prev.map(p => {
        if (p.id === platformId) {
          return { ...p, connected: false, isPrimary: false, accountName: undefined };
        }
        return p;
      });

      if (wasPrimary) {
        const firstConnected = updated.find(p => p.connected);
        if (firstConnected) {
          return updated.map(p => 
            p.id === firstConnected.id ? { ...p, isPrimary: true } : p
          );
        }
      }
      return updated;
    };

    setPlatforms(optimisticUpdate);

    // If authenticated, sync with Supabase
    if (!isGuest && user) {
      try {
        const { error } = await supabase
          .from("connected_platforms")
          .delete()
          .eq("user_id", user.id)
          .eq("platform_id", platformId);

        if (error) {
          // Reload from Supabase on error
          const { data } = await supabase
            .from("connected_platforms")
            .select("*")
            .eq("user_id", user.id);
          
          if (data) {
            const connectedPlatforms = data as ConnectedPlatformRow[];
            setPlatforms(DEFAULT_PLATFORMS.map(p => {
              const connected = connectedPlatforms.find(c => c.platform_id === p.id);
              return connected 
                ? { ...p, connected: true, isPrimary: connected.is_primary, accountName: connected.account_name }
                : p;
            }));
          }
          return { success: false, error: error.message };
        }

        // Update primary if needed in Supabase
        if (wasPrimary) {
          const newPrimary = platforms.find(p => p.connected && p.id !== platformId);
          if (newPrimary) {
            await supabase
              .from("connected_platforms")
              .update({ is_primary: true })
              .eq("user_id", user.id)
              .eq("platform_id", newPrimary.id);
          }
        }
      } catch (err) {
        return { success: false, error: "Failed to disconnect platform" };
      }
    }

    return { success: true };
  }, [platforms, isGuest, user]);

  const getConnectedCount = useCallback(() => platforms.filter(p => p.connected).length, [platforms]);

  return (
    <PlatformContext.Provider
      value={{
        platforms,
        primaryPlatform,
        connectPlatform,
        disconnectPlatform,
        getConnectedCount,
        isLoading,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatforms = () => {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatforms must be used within PlatformProvider");
  return ctx;
};
