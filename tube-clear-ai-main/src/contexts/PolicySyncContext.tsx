import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePolicyWatcher } from "@/contexts/PolicyWatcherContext";
import { vault } from "@/utils/historicalVault";
import { useNotifications } from "@/contexts/NotificationContext";

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

  // Save violations to localStorage
  useEffect(() => {
    localStorage.setItem("tubeclear_violation_warnings", JSON.stringify(violationWarnings));
  }, [violationWarnings]);

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
      // Step 1: Check for policy updates
      const hasUpdates = await checkForUpdates();
      
      if (!hasUpdates) {
        console.log("No policy updates found");
        setLastScanTime(new Date());
        setIsScanning(false);
        return;
      }

      console.log("Policy updates detected! Scanning videos...");

      // Step 2: Get all videos from IndexedDB
      const allVideos = await vault.getAllVideos();
      
      if (allVideos.length === 0) {
        console.log("No videos in vault to scan");
        setLastScanTime(new Date());
        setIsScanning(false);
        return;
      }

      // Step 3: Check each video against updated policies
      const newViolations: ViolationWarning[] = [];
      
      Object.keys(livePolicies).forEach(platformId => {
        const policies = livePolicies[platformId] || [];
        
        allVideos.forEach(video => {
          if (video.platform === platformId) {
            const violations = checkVideoAgainstPolicies(video, policies);
            newViolations.push(...violations);
          }
        });
      });

      // Step 4: Filter out already dismissed violations
      const existingVideoIds = new Set(
        violationWarnings.map(v => v.videoId)
      );
      
      const uniqueNewViolations = newViolations.filter(
        v => !existingVideoIds.has(v.videoId)
      );

      // Step 5: Add new violations and notify user
      if (uniqueNewViolations.length > 0) {
        setViolationWarnings(prev => [...prev, ...uniqueNewViolations]);
        
        // Show notification
        addNotification({
          title: "⚠️ Policy Violations Detected",
          message: `${uniqueNewViolations.length} video(s) may violate updated policies. Review now.`,
          type: "warning",
        });

        console.log(`Found ${uniqueNewViolations.length} new violations`);
      } else {
        console.log("No new violations detected");
      }

      setLastScanTime(new Date());
    } catch (error) {
      console.error("Policy sync failed:", error);
    } finally {
      setIsScanning(false);
    }
  }, [livePolicies, checkForUpdates, violationWarnings, checkVideoAgainstPolicies, addNotification]);

  // Dismiss a violation warning
  const dismissViolation = useCallback((videoId: string) => {
    setViolationWarnings(prev => prev.filter(v => v.videoId !== videoId));
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
