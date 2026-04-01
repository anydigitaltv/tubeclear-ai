import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PolicyViolation {
  id: string;
  feature: string;
  rule: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  status: "active" | "disabled" | "reviewed" | "dismissed";
  autoDisabled: boolean;
  adminNotified: boolean;
  platform: "playstore" | "appstore" | "admob" | "youtube" | "tiktok";
  suggestedFix?: string;
}

export interface AdminAlert {
  id: string;
  type: "feature_disabled" | "policy_violation" | "critical_issue";
  message: string;
  timestamp: string;
  violationId: string;
  delivered: boolean;
  deliveredAt?: string;
}

interface AIDoctorContextType {
  violations: PolicyViolation[];
  adminAlerts: AdminAlert[];
  disabledFeatures: string[];
  checkFeature: (feature: string) => PolicyViolation | null;
  disableFeature: (feature: string, reason: string) => void;
  enableFeature: (feature: string) => void;
  reviewViolation: (violationId: string, action: "approve" | "dismiss") => void;
  sendAdminAlert: (alert: Omit<AdminAlert, "id" | "timestamp" | "delivered">) => Promise<void>;
  getViolationsByFeature: (feature: string) => PolicyViolation[];
  isFeatureSafe: (feature: string) => boolean;
}

const ADMIN_PHONE = "+923154414981";

const AIDoctorContext = createContext<AIDoctorContextType | undefined>(undefined);

const VIOLATIONS_KEY = "tubeclear_policy_violations";
const ALERTS_KEY = "tubeclear_admin_alerts";
const DISABLED_KEY = "tubeclear_disabled_features";

export const AIDoctorProvider = ({ children }: { children: ReactNode }) => {
  const [violations, setViolations] = useState<PolicyViolation[]>(() => {
    try {
      const stored = localStorage.getItem(VIOLATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [disabledFeatures, setDisabledFeatures] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DISABLED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveViolations = useCallback((v: PolicyViolation[]) => {
    localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(v));
    setViolations(v);
  }, []);

  const saveAlerts = useCallback((a: AdminAlert[]) => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(a));
    setAdminAlerts(a);
  }, []);

  const saveDisabled = useCallback((f: string[]) => {
    localStorage.setItem(DISABLED_KEY, JSON.stringify(f));
    setDisabledFeatures(f);
  }, []);

  const checkFeature = useCallback((feature: string): PolicyViolation | null => {
    return violations.find((v) => v.feature === feature && v.status === "active") || null;
  }, [violations]);

  const isFeatureSafe = useCallback((feature: string): boolean => {
    return !disabledFeatures.includes(feature) && !checkFeature(feature);
  }, [disabledFeatures, checkFeature]);

  const disableFeature = useCallback((feature: string, reason: string) => {
    if (!disabledFeatures.includes(feature)) {
      saveDisabled([...disabledFeatures, feature]);
    }

    const violation: PolicyViolation = {
      id: `violation-${feature}-${Date.now()}`,
      feature,
      rule: reason,
      severity: "high",
      detectedAt: new Date().toISOString(),
      status: "active",
      autoDisabled: true,
      adminNotified: false,
      platform: "playstore",
    };

    saveViolations([violation, ...violations]);

    sendAdminAlert({
      type: "feature_disabled",
      message: `Feature "${feature}" auto-disabled due to: ${reason}`,
      violationId: violation.id,
    });
  }, [disabledFeatures, violations, saveDisabled, saveViolations]);

  const enableFeature = useCallback((feature: string) => {
    saveDisabled(disabledFeatures.filter((f) => f !== feature));
    const updated = violations.map((v) =>
      v.feature === feature && v.status === "active"
        ? { ...v, status: "reviewed" as const }
        : v
    );
    saveViolations(updated);
  }, [disabledFeatures, violations, saveDisabled, saveViolations]);

  const reviewViolation = useCallback((violationId: string, action: "approve" | "dismiss") => {
    const violation = violations.find((v) => v.id === violationId);
    if (!violation) return;

    if (action === "approve") {
      saveViolations(violations.map((v) =>
        v.id === violationId ? { ...v, status: "reviewed" as const } : v
      ));
    } else {
      enableFeature(violation.feature);
      saveViolations(violations.map((v) =>
        v.id === violationId ? { ...v, status: "dismissed" as const } : v
      ));
    }
  }, [violations, enableFeature, saveViolations]);

  const sendAdminAlert = useCallback(async (alert: Omit<AdminAlert, "id" | "timestamp" | "delivered">) => {
    const newAlert: AdminAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    saveAlerts([newAlert, ...adminAlerts]);

    try {
      console.log(`[ADMIN SMS] To: ${ADMIN_PHONE}`);
      console.log(`[ADMIN SMS] Message: ${alert.message}`);

      const updated = adminAlerts.map((a) =>
        a.id === newAlert.id
          ? { ...a, delivered: true, deliveredAt: new Date().toISOString() }
          : a
      );
      saveAlerts([newAlert, ...updated]);

      if (alert.violationId) {
        saveViolations(violations.map((v) =>
          v.id === alert.violationId ? { ...v, adminNotified: true } : v
        ));
      }
    } catch (error) {
      console.error("Failed to send admin alert:", error);
    }
  }, [adminAlerts, violations, saveAlerts, saveViolations]);

  const getViolationsByFeature = useCallback((feature: string) => {
    return violations.filter((v) => v.feature === feature);
  }, [violations]);

  return (
    <AIDoctorContext.Provider
      value={{
        violations,
        adminAlerts,
        disabledFeatures,
        checkFeature,
        disableFeature,
        enableFeature,
        reviewViolation,
        sendAdminAlert,
        getViolationsByFeature,
        isFeatureSafe,
      }}
    >
      {children}
    </AIDoctorContext.Provider>
  );
};

export const useAIDoctor = () => {
  const ctx = useContext(AIDoctorContext);
  if (!ctx) throw new Error("useAIDoctor must be used within AIDoctorProvider");
  return ctx;
};
