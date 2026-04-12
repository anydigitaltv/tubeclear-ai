import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePolicyWatcher } from "@/contexts/PolicyWatcherContext";
import { vault } from "@/utils/historicalVault";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface ViolationWarning {
  videoId: string;
  platformId: string;
  title: string;
  thumbnail?: string;
  violationType: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  policyId: string;
  policyTitle: string;
  description: string;
  urduDescription?: string;
}

interface PolicySyncContextType {
  violationWarnings: ViolationWarning[];
  isScanning: boolean;
  lastScanTime: Date | null;
  triggerPolicySync: () => Promise<void>;
  dismissViolation: (videoId: string) => void;
  getViolationCount: () => number;
}

const PolicySyncContext = createContext<PolicySyncContextType | undefined>(undefined);

export const PolicySyncProvider = ({ children }: { children: ReactNode }) => {
  const { livePolicies, checkForUpdates } = usePolicyWatcher();
  const { addNotification } = useNotifications();
  const { user, isGuest } = useAuth();
  
  const [violationWarnings, setViolationWarnings] = useState<ViolationWarning[]>(() => {
    try {
      const stored = localStorage.getItem("tubeclear_violation_warnings");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Load and sync alerts on mount/auth change
  useEffect(() => {
    const loadAlerts = async () => {
      if (!isGuest && user) {
        // Fetch permanent alerts from Supabase
        const { data, error } = await supabase
          .from("violation_alerts")
          .select("*")
          .eq("user_id", user.id);

        if (!error && data) {
          const transformed: ViolationWarning[] = data.map(item => ({
            videoId: item.video_id,
            platformId: item.platform_id,
            title: item.title,
            violationType: 'policy',
            severity: item.severity as any,
            detectedAt: item.detected_at,
            policyId: item.policy_id,
            policyTitle: item.policy_title,
            description: item.description,
            urduDescription: item.urdu_description
          }));
          setViolationWarnings(transformed);
        }
      }
    };

    loadAlerts();

    // Save to localStorage as backup
    if (isGuest) {
      localStorage.setItem("tubeclear_violation_warnings", JSON.stringify(violationWarnings));
    }
  }, [user, isGuest]);

  // Check if a video violates any policy
  const checkVideoAgainstPolicies = useCallback((
    video: any,
    policies: any[]
  ): ViolationWarning[] => {
    const violations: ViolationWarning[] = [];

    policies.forEach(policy => {
      // Check if video metadata contains policy keywords
      const contentToCheck = [
        video.title || "",
        video.description || "",
        ...(video.tags || []),
      ].join(" ").toLowerCase();

      const hasViolation = policy.keywords.some((keyword: string) =>
        contentToCheck.includes(keyword.toLowerCase())
      );

      if (hasViolation) {
        violations.push({
          videoId: video.videoId,
          platformId: video.platform,
          title: video.title,
          thumbnail: video.thumbnail,
          violationType: policy.category,
          severity: "medium", // Can be enhanced based on policy severity
          detectedAt: new Date().toISOString(),
          policyId: policy.id,
          policyTitle: policy.title,
          description: `This video may violate the "${policy.title}" policy. Keywords matched: ${policy.keywords.join(", ")}`,
          urduDescription: policy.urduDescription || "Is video mein nayi policy ki khilaf-warzi ho sakti hai.",
        });
      }
    });

    return violations;
  }, []);

  // Main policy sync function
  const triggerPolicySync = useCallback(async () => {
    setIsScanning(true);
    
    try {
      await checkForUpdates();
      console.log("Policy updates detected! Scanning videos...");

      // Step 2: Get all videos from IndexedDB
      const allVideos = await vault.getAllVideos();
      
      if (allVideos.length === 0) {
        console.log("No videos in vault to scan");
        setLastScanTime(new Date());
        setIsScanning(false);
        return;
      }

      // Step 3: Re-calculate all current violations
      const currentViolations: ViolationWarning[] = [];
      
      Object.keys(livePolicies).forEach(platformId => {
        const policies = livePolicies[platformId] || [];
        
        allVideos.forEach(video => {
          if (video.platform === platformId) {
            const violations = checkVideoAgainstPolicies(video, policies);
            currentViolations.push(...violations);
          }
        });
      });

      // Step 4: Logic to add new alerts and REMOVE fixed ones
      const prevViolationIds = new Set(violationWarnings.map(v => `${v.videoId}-${v.policyId}`));
      const currentViolationIds = new Set(currentViolations.map(v => `${v.videoId}-${v.policyId}`));

      // Fixed videos (in prev but not in current)
      const fixedAlerts = violationWarnings.filter(v => !currentViolationIds.has(`${v.videoId}-${v.policyId}`));
      
      if (fixedAlerts.length > 0 && !isGuest && user) {
        for (const fixed of fixedAlerts) {
          await supabase
            .from("violation_alerts")
            .delete()
            .eq("user_id", user.id)
            .eq("video_id", fixed.videoId)
            .eq("policy_id", fixed.policyId);
        }
        console.log(`Resolved ${fixedAlerts.length} violations automatically.`);
      }

      // Step 5: Save new ones to Supabase
      const newAlerts = currentViolations.filter(v => !prevViolationIds.has(`${v.videoId}-${v.policyId}`));
      
      if (newAlerts.length > 0) {
        if (!isGuest && user) {
          const toInsert = newAlerts.map(v => ({
            user_id: user.id,
            video_id: v.videoId,
            platform_id: v.platformId,
            title: v.title,
            policy_id: v.policyId,
            policy_title: v.policyTitle,
            severity: v.severity,
            description: v.description,
            urdu_description: v.urduDescription
          }));
          await supabase.from("violation_alerts").upsert(toInsert);
        }

        setViolationWarnings(currentViolations);
        addNotification({
          title: "⚠️ Policy Updates",
          message: `${newAlerts.length} videos have new violations. Fixed videos were removed.`,
          type: "warning",
        });
      } else {
        setViolationWarnings(currentViolations);
      }

      setLastScanTime(new Date());
    } catch (error) {
      console.error("Policy sync failed:", error);
    } finally {
      setIsScanning(false);
    }
  }, [livePolicies, checkForUpdates, violationWarnings, checkVideoAgainstPolicies, addNotification]);

  // Dismiss a violation warning
  const dismissViolation = useCallback(async (videoId: string) => {
    setViolationWarnings(prev => prev.filter(v => v.videoId !== videoId));
    
    if (!isGuest && user) {
      await supabase
        .from("violation_alerts")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);
    }
  }, []);

  // Get violation count
  const getViolationCount = useCallback(() => {
    return violationWarnings.length;
  }, [violationWarnings]);

  // Auto-sync on mount and periodically
  useEffect(() => {
    // Initial sync
    triggerPolicySync();

    // Periodic sync every 6 hours
    const interval = setInterval(triggerPolicySync, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [triggerPolicySync]);

  return (
    <PolicySyncContext.Provider
      value={{
        violationWarnings,
        isScanning,
        lastScanTime,
        triggerPolicySync,
        dismissViolation,
        getViolationCount,
      }}
    >
      {children}
    </PolicySyncContext.Provider>
  );
};

export const usePolicySync = () => {
  const context = useContext(PolicySyncContext);
  if (!context) {
    throw new Error("usePolicySync must be used within PolicySyncProvider");
  }
  return context;
};
