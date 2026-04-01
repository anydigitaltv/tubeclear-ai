import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useCoins } from "./CoinContext";

export interface FlaggedVideo {
  videoId: string;
  platformId: string;
  title: string;
  thumbnailUrl?: string;
  flaggedAt: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AccessPass {
  id: string;
  videoId: string;
  purchasedAt: string;
  expiresAt: string;
  cost: number;
}

interface WarningDashboardContextType {
  flaggedVideos: FlaggedVideo[];
  accessPasses: AccessPass[];
  isVideoFlagged: (videoId: string) => boolean;
  hasAccessPass: (videoId: string) => boolean;
  getRemainingTime: (videoId: string) => number | null; // seconds remaining
  purchaseAccessPass: (videoId: string) => { success: boolean; error?: string };
  flagVideo: (video: Omit<FlaggedVideo, "flaggedAt">) => void;
  unflagVideo: (videoId: string) => void;
  clearExpiredPasses: () => void;
}

const FLAGGED_KEY = "tubeclear_flagged_videos";
const PASSES_KEY = "tubeclear_access_passes";
const PASS_COST = 5;
const PASS_DURATION_HOURS = 24;

const WarningDashboardContext = createContext<WarningDashboardContextType | undefined>(undefined);

export const WarningDashboardProvider = ({ children }: { children: ReactNode }) => {
  const { balance, spendCoins } = useCoins();

  const [flaggedVideos, setFlaggedVideos] = useState<FlaggedVideo[]>(() => {
    try {
      const stored = localStorage.getItem(FLAGGED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [accessPasses, setAccessPasses] = useState<AccessPass[]>(() => {
    try {
      const stored = localStorage.getItem(PASSES_KEY);
      if (!stored) return [];
      
      const passes: AccessPass[] = JSON.parse(stored);
      // Filter out expired passes on load
      const now = new Date();
      return passes.filter((p) => new Date(p.expiresAt) > now);
    } catch {
      return [];
    }
  });

  const saveFlaggedVideos = useCallback((videos: FlaggedVideo[]) => {
    localStorage.setItem(FLAGGED_KEY, JSON.stringify(videos));
    setFlaggedVideos(videos);
  }, []);

  const saveAccessPasses = useCallback((passes: AccessPass[]) => {
    localStorage.setItem(PASSES_KEY, JSON.stringify(passes));
    setAccessPasses(passes);
  }, []);

  const isVideoFlagged = useCallback((videoId: string) => {
    return flaggedVideos.some((v) => v.videoId === videoId);
  }, [flaggedVideos]);

  const hasAccessPass = useCallback((videoId: string) => {
    const now = new Date();
    return accessPasses.some(
      (p) => p.videoId === videoId && new Date(p.expiresAt) > now
    );
  }, [accessPasses]);

  const getRemainingTime = useCallback((videoId: string): number | null => {
    const pass = accessPasses.find((p) => p.videoId === videoId);
    if (!pass) return null;

    const now = new Date();
    const expiresAt = new Date(pass.expiresAt);
    const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    
    return remaining > 0 ? remaining : null;
  }, [accessPasses]);

  const purchaseAccessPass = useCallback((videoId: string): { success: boolean; error?: string } => {
    // Check if already has pass
    if (hasAccessPass(videoId)) {
      return { success: true };
    }

    // Check if user has enough coins
    if (balance < PASS_COST) {
      return { success: false, error: "Insufficient coins. You need 5 coins for a 24h access pass." };
    }

    // Spend coins
    const spent = spendCoins(PASS_COST, "access_pass", `24h access pass for video: ${videoId}`);
    if (!spent) {
      return { success: false, error: "Failed to process payment." };
    }

    // Create pass
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASS_DURATION_HOURS * 60 * 60 * 1000);

    const newPass: AccessPass = {
      id: `pass-${videoId}-${Date.now()}`,
      videoId,
      purchasedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      cost: PASS_COST,
    };

    saveAccessPasses([...accessPasses, newPass]);
    return { success: true };
  }, [balance, spendCoins, accessPasses, hasAccessPass, saveAccessPasses]);

  const flagVideo = useCallback((video: Omit<FlaggedVideo, "flaggedAt">) => {
    if (isVideoFlagged(video.videoId)) return;

    const flagged: FlaggedVideo = {
      ...video,
      flaggedAt: new Date().toISOString(),
    };
    saveFlaggedVideos([...flaggedVideos, flagged]);
  }, [flaggedVideos, isVideoFlagged, saveFlaggedVideos]);

  const unflagVideo = useCallback((videoId: string) => {
    saveFlaggedVideos(flaggedVideos.filter((v) => v.videoId !== videoId));
  }, [flaggedVideos, saveFlaggedVideos]);

  const clearExpiredPasses = useCallback(() => {
    const now = new Date();
    const validPasses = accessPasses.filter((p) => new Date(p.expiresAt) > now);
    if (validPasses.length !== accessPasses.length) {
      saveAccessPasses(validPasses);
    }
  }, [accessPasses, saveAccessPasses]);

  return (
    <WarningDashboardContext.Provider
      value={{
        flaggedVideos,
        accessPasses,
        isVideoFlagged,
        hasAccessPass,
        getRemainingTime,
        purchaseAccessPass,
        flagVideo,
        unflagVideo,
        clearExpiredPasses,
      }}
    >
      {children}
    </WarningDashboardContext.Provider>
  );
};

export const useWarningDashboard = () => {
  const ctx = useContext(WarningDashboardContext);
  if (!ctx) throw new Error("useWarningDashboard must be used within WarningDashboardProvider");
  return ctx;
};

export { PASS_COST, PASS_DURATION_HOURS };
