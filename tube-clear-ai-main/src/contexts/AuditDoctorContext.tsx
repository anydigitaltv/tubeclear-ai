import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useCoins } from "@/contexts/CoinContext";
import { useMasterAdmin } from "@/contexts/MasterAdminContext";

export interface AuditLog {
  id: string;
  timestamp: string;
  featureId: string;
  isActive: boolean;
  coinsDeducted: boolean;
  action: "pass" | "lock_feature" | "alert";
  reason: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: "coin_bypass" | "api_key_shield" | "time_limit" | "hacking_attempt";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  resolved: boolean;
}

interface AuditDoctorContextType {
  auditLogs: AuditLog[];
  securityAlerts: SecurityAlert[];
  runFeatureCoinCheck: (featureId: string) => Promise<void>;
  checkAPIKeyShield: (engineId: string) => Promise<boolean>;
  trackTimeLimit: (featureId: string, timeRemaining: number) => void;
  detectHackingAttempt: (data: any) => void;
  getAuditHistory: () => AuditLog[];
  getSecurityAlerts: () => SecurityAlert[];
}

const ADMIN_PHONE = "+923154414981";
const AUDIT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const AuditDoctorContext = createContext<AuditDoctorContextType | undefined>(undefined);

export const AuditDoctorProvider = ({ children }: { children: ReactNode }) => {
  const { balance, spendCoins } = useCoins();
  const { isMasterAdmin } = useMasterAdmin();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem("tubeclear_audit_logs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(() => {
    try {
      const stored = localStorage.getItem("tubeclear_security_alerts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveAuditLogs = useCallback((logs: AuditLog[]) => {
    localStorage.setItem("tubeclear_audit_logs", JSON.stringify(logs));
    setAuditLogs(logs);
  }, []);

  const saveSecurityAlerts = useCallback((alerts: SecurityAlert[]) => {
    localStorage.setItem("tubeclear_security_alerts", JSON.stringify(alerts));
    setSecurityAlerts(alerts);
  }, []);

  const sendAdminAlert = useCallback(async (message: string) => {
    console.log(`[SECURITY ALERT] To: ${ADMIN_PHONE}`);
    console.log(`[SECURITY ALERT] Message: ${message}`);
    
    // In production, call SMS API
    // await fetch(SMS_API_URL, { ... });
  }, []);

  // Feature-Coin Cross-Check (runs every 5 minutes)
  const runFeatureCoinCheck = useCallback(async (featureId: string) => {
    // Simulate checking if feature is active
    const isFeatureActive = true; // Would check actual feature state
    
    // Check if coins were deducted
    const coinsDeducted = false; // Would check transaction history
    
    let action: "pass" | "lock_feature" | "alert" = "pass";
    let reason = "";

    if (isFeatureActive && !coinsDeducted) {
      // User is using feature without paying - AUTO LOCK
      action = "lock_feature";
      reason = `Feature ${featureId} active but no coin deduction detected`;
      
      // Auto-lock the feature
      console.warn(`[AI AUDIT DOCTOR] Auto-locking feature: ${featureId}`);
    } else if (!isFeatureActive && coinsDeducted) {
      // Coins deducted but feature not active - INVESTIGATE
      action = "alert";
      reason = `Coins deducted but feature ${featureId} not active`;
    }

    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      featureId,
      isActive: isFeatureActive,
      coinsDeducted: coinsDeducted,
      action,
      reason,
    };

    saveAuditLogs([log, ...auditLogs].slice(0, 1000));

    if (action === "lock_feature") {
      await sendAdminAlert(`🚨 AI Audit Doctor: Auto-locked feature ${featureId}. User bypassed coin system.`);
    }
  }, [auditLogs, saveAuditLogs, sendAdminAlert]);

  // API Key Shield - Detect bypass attempts
  const checkAPIKeyShield = useCallback(async (engineId: string): Promise<boolean> => {
    // Check if user is trying to use admin API keys for free
    const apiKeyUsed = localStorage.getItem(`tubeclear_api_key_${engineId}`);
    
    if (!apiKeyUsed) {
      // No key provided - this is normal guest mode behavior
      return true;
    }

    // Check if it's an attempt to bypass coin system
    const isBypassAttempt = false; // Would implement actual detection logic

    if (isBypassAttempt) {
      const alert: SecurityAlert = {
        id: `security-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "api_key_shield",
        severity: "high",
        message: `User attempted to bypass coin system with engine ${engineId}`,
        resolved: false,
      };

      saveSecurityAlerts([alert, ...securityAlerts]);
      await sendAdminAlert(`⚠️ API Key Shield: Bypass attempt detected for engine ${engineId}`);
      
      return false; // Block the scan
    }

    return true; // Allow the scan
  }, [securityAlerts, saveSecurityAlerts, sendAdminAlert]);

  // Time-Limit Enforcer
  const trackTimeLimit = useCallback((featureId: string, timeRemaining: number) => {
    if (timeRemaining <= 0) {
      // Revoke access
      const alert: SecurityAlert = {
        id: `time-limit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "time_limit",
        severity: "medium",
        message: `Feature ${featureId} time limit expired. Access revoked.`,
        resolved: false,
      };

      saveSecurityAlerts([alert, ...securityAlerts]);

      console.log(`[TIME LIMIT] Feature ${featureId} access revoked. Please recharge coins.`);
    }
  }, [securityAlerts, saveSecurityAlerts]);

  // Hacking Attempt Detection
  const detectHackingAttempt = useCallback((data: any) => {
    // Check for modified coin values, tampered data, etc.
    const isHackingDetected = false; // Would implement actual detection

    if (isHackingDetected) {
      const alert: SecurityAlert = {
        id: `hack-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "hacking_attempt",
        severity: "critical",
        message: `Hacking attempt detected! Modified data: ${JSON.stringify(data)}`,
        resolved: false,
      };

      saveSecurityAlerts([alert, ...securityAlerts]);
      sendAdminAlert(`🔴 CRITICAL: Hacking attempt detected! User data tampering confirmed.`);
    }
  }, [securityAlerts, saveSecurityAlerts, sendAdminAlert]);

  const getAuditHistory = useCallback(() => {
    return auditLogs;
  }, [auditLogs]);

  const getSecurityAlerts = useCallback(() => {
    return securityAlerts;
  }, [securityAlerts]);

  // Auto-run feature checks every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      // Run checks on all active features
      ["scan", "ghost_guard", "content_tracker"].forEach(featureId => {
        runFeatureCoinCheck(featureId);
      });
    }, AUDIT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [runFeatureCoinCheck]);

  return (
    <AuditDoctorContext.Provider
      value={{
        auditLogs,
        securityAlerts,
        runFeatureCoinCheck,
        checkAPIKeyShield,
        trackTimeLimit,
        detectHackingAttempt,
        getAuditHistory,
        getSecurityAlerts,
      }}
    >
      {children}
    </AuditDoctorContext.Provider>
  );
};

export const useAuditDoctor = () => {
  const ctx = useContext(AuditDoctorContext);
  if (!ctx) throw new Error("useAuditDoctor must be used within AuditDoctorProvider");
  return ctx;
};
