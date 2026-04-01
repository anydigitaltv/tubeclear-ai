import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePolicyRules, type PolicyRule } from "./PolicyRulesContext";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface ViolationAlert {
  id: string;
  videoId: string;
  platformId: string;
  videoTitle: string;
  violatedRule: PolicyRule;
  detectedAt: string;
  acknowledged: boolean;
  type: "new_policy_violation" | "content_change" | "misleading_content";
}

interface GhostGuardContextType {
  alerts: ViolationAlert[];
  unacknowledgedCount: number;
  scanOldData: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
  dismissAllAlerts: () => void;
  addAlert: (alert: ViolationAlert) => void;
  isScanning: boolean;
  lastScanTime: string | null;
}

const ALERTS_STORAGE_KEY = "tubeclear_violation_alerts";

const GhostGuardContext = createContext<GhostGuardContextType | undefined>(undefined);

export const GhostGuardProvider = ({ children }: { children: ReactNode }) => {
  const { checkViolation, lastPolicyUpdate } = usePolicyRules();
  const { user, isGuest } = useAuth();
  const [alerts, setAlerts] = useState<ViolationAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem("tubeclear_ghost_last_scan");
    } catch {
      return null;
    }
  });

  const saveAlerts = useCallback((newAlerts: ViolationAlert[]) => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(newAlerts));
    setAlerts(newAlerts);
  }, []);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  // Add a single alert
  const addAlert = useCallback((alert: ViolationAlert) => {
    saveAlerts([...alerts, alert]);
  }, [alerts, saveAlerts]);

  // Scan old video data against new policies - Zero API cost
  const scanOldData = useCallback(async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    const newAlerts: ViolationAlert[] = [];

    try {
      // Get stored video scans from database or localStorage
      if (!isGuest && user) {
        const { data: videoScans } = await supabase
          .from("video_scans")
          .select("*")
          .eq("user_id", user.id);

        if (videoScans) {
          for (const scan of videoScans) {
            const result = scan.scan_result as {
              title?: string;
              description?: string;
              tags?: string[];
              thumbnailStatus?: string;
            };
            
            // Check title against rules
            const titleViolations = checkViolation(
              scan.title || "",
              scan.platform_id
            );

            // Check description against rules
            const descViolations = checkViolation(
              result?.description || "",
              scan.platform_id
            );

            // Check tags against rules
            const tagsText = (result?.tags || []).join(" ");
            const tagViolations = checkViolation(tagsText, scan.platform_id);

            // Combine all violations
            const allViolations = [...titleViolations, ...descViolations, ...tagViolations];

            for (const rule of allViolations) {
              const alertId = `${scan.video_id}-${rule.id}-${Date.now()}`;
              const existingAlert = alerts.find(
                (a) => a.videoId === scan.video_id && a.violatedRule.id === rule.id
              );

              if (!existingAlert) {
                newAlerts.push({
                  id: alertId,
                  videoId: scan.video_id,
                  platformId: scan.platform_id,
                  videoTitle: scan.title,
                  violatedRule: rule,
                  detectedAt: new Date().toISOString(),
                  acknowledged: false,
                  type: "new_policy_violation",
                });
              }
            }
          }
        }
      }

      // Also check localStorage history
      const historyKey = "tubeclear_scan_history";
      const localHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
      
      for (const item of localHistory) {
        const titleViolations = checkViolation(item.title || "", item.platformId || "youtube");
        
        for (const rule of titleViolations) {
          const alertId = `${item.videoId || item.url}-${rule.id}-${Date.now()}`;
          const existingAlert = alerts.find(
            (a) => a.videoId === (item.videoId || item.url) && a.violatedRule.id === rule.id
          );

          if (!existingAlert) {
            newAlerts.push({
              id: alertId,
              videoId: item.videoId || item.url,
              platformId: item.platformId || "youtube",
              videoTitle: item.title,
              violatedRule: rule,
              detectedAt: new Date().toISOString(),
              acknowledged: false,
              type: "new_policy_violation",
            });
          }
        }
      }

      if (newAlerts.length > 0) {
        saveAlerts([...alerts, ...newAlerts]);
      }

      const now = new Date().toISOString();
      localStorage.setItem("tubeclear_ghost_last_scan", now);
      setLastScanTime(now);
    } catch (error) {
      console.error("Ghost Guard scan failed:", error);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, isGuest, user, checkViolation, alerts, saveAlerts]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    const updated = alerts.map((a) =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    );
    saveAlerts(updated);
  }, [alerts, saveAlerts]);

  const dismissAllAlerts = useCallback(() => {
    const updated = alerts.map((a) => ({ ...a, acknowledged: true }));
    saveAlerts(updated);
  }, [alerts, saveAlerts]);

  // Auto-scan when policies are updated
  useEffect(() => {
    if (lastPolicyUpdate) {
      const lastScan = localStorage.getItem("tubeclear_ghost_last_scan");
      if (!lastScan || new Date(lastPolicyUpdate) > new Date(lastScan)) {
        scanOldData();
      }
    }
  }, [lastPolicyUpdate, scanOldData]);

  return (
    <GhostGuardContext.Provider
      value={{
        alerts,
        unacknowledgedCount,
        scanOldData,
        acknowledgeAlert,
        dismissAllAlerts,
        addAlert,
        isScanning,
        lastScanTime,
      }}
    >
      {children}
    </GhostGuardContext.Provider>
  );
};

export const useGhostGuard = () => {
  const ctx = useContext(GhostGuardContext);
  if (!ctx) throw new Error("useGhostGuard must be used within GhostGuardProvider");
  return ctx;
};
