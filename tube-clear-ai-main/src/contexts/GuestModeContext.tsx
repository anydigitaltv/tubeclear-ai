import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface GuestKey {
  engineId: string;
  key: string;
  status: "valid" | "invalid" | "quota_exceeded" | "checking";
  quotaStatus: "green" | "orange" | "red" | "unknown";
  lastChecked: string;
  usageCount: number;
}

interface GuestModeContextType {
  isGuest: boolean;
  scanCount: number;
  maxScans: number;
  guestKeys: GuestKey[];
  canScan: boolean;
  remainingScans: number;
  incrementScanCount: () => boolean;
  saveGuestKey: (engineId: string, key: string) => void;
  removeGuestKey: (engineId: string) => void;
  checkKeyValidity: (engineId: string) => Promise<GuestKey["status"]>;
  getKeyQuotaStatus: (engineId: string) => GuestKey["quotaStatus"];
  getValidKey: (engineId: string) => GuestKey | null;
  getQuotaColor: (engineId: string) => string;
  showLimitMessage: () => string;
}

const GUEST_SCAN_KEY = "tubeclear_guest_scans";
const GUEST_KEYS_KEY = "tubeclear_guest_keys";
const MAX_GUEST_SCANS = 3;

const LIMIT_MESSAGES: Record<string, string> = {
  en: "Your data is not being saved. Please login to save history!",
  hi: "Aapka data save nahi ho raha, history ke liye Login karein!",
  es: "Tus datos no se están guardando. ¡Inicia sesión para guardar el historial!",
  ur: "Aapka data save nahi ho raha, history ke liye Login karein!",
  ar: "لم يتم حفظ بياناتك. سجل الدخول لحفظ السجل!",
};

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export const GuestModeProvider = ({ children }: { children: ReactNode }) => {
  const [scanCount, setScanCount] = useState(() => {
    try {
      const stored = localStorage.getItem(GUEST_SCAN_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [guestKeys, setGuestKeys] = useState<GuestKey[]>(() => {
    try {
      const stored = localStorage.getItem(GUEST_KEYS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isGuest = true;

  const remainingScans = Math.max(0, MAX_GUEST_SCANS - scanCount);
  const canScan = scanCount < MAX_GUEST_SCANS;

  const saveGuestKeys = useCallback((keys: GuestKey[]) => {
    localStorage.setItem(GUEST_KEYS_KEY, JSON.stringify(keys));
    setGuestKeys(keys);
  }, []);

  const incrementScanCount = useCallback((): boolean => {
    if (scanCount >= MAX_GUEST_SCANS) {
      return false;
    }
    const newCount = scanCount + 1;
    localStorage.setItem(GUEST_SCAN_KEY, newCount.toString());
    setScanCount(newCount);
    return true;
  }, [scanCount]);

  const saveGuestKey = useCallback((engineId: string, key: string) => {
    const existing = guestKeys.find((k) => k.engineId === engineId);
    if (existing) {
      saveGuestKeys(guestKeys.map((k) =>
        k.engineId === engineId
          ? { ...k, key, status: "checking" as const, lastChecked: new Date().toISOString() }
          : k
      ));
    } else {
      saveGuestKeys([
        ...guestKeys,
        {
          engineId,
          key,
          status: "checking",
          quotaStatus: "unknown",
          lastChecked: new Date().toISOString(),
          usageCount: 0,
        },
      ]);
    }
  }, [guestKeys, saveGuestKeys]);

  const removeGuestKey = useCallback((engineId: string) => {
    saveGuestKeys(guestKeys.filter((k) => k.engineId !== engineId));
  }, [guestKeys, saveGuestKeys]);

  const checkKeyValidity = useCallback(async (engineId: string): Promise<GuestKey["status"]> => {
    const guestKey = guestKeys.find((k) => k.engineId === engineId);
    if (!guestKey) return "invalid";

    try {
      const isValid = Math.random() > 0.1;
      const quotaLevel = Math.random();

      const status = isValid ? "valid" : "invalid";
      const quotaStatus: GuestKey["quotaStatus"] = 
        quotaLevel > 0.7 ? "green" : quotaLevel > 0.3 ? "orange" : "red";

      saveGuestKeys(guestKeys.map((k) =>
        k.engineId === engineId
          ? { ...k, status, quotaStatus, lastChecked: new Date().toISOString() }
          : k
      ));

      return status;
    } catch {
      return "invalid";
    }
  }, [guestKeys, saveGuestKeys]);

  const getKeyQuotaStatus = useCallback((engineId: string): GuestKey["quotaStatus"] => {
    const guestKey = guestKeys.find((k) => k.engineId === engineId);
    return guestKey?.quotaStatus || "unknown";
  }, [guestKeys]);

  const getValidKey = useCallback((engineId: string): GuestKey | null => {
    const guestKey = guestKeys.find((k) => k.engineId === engineId && k.status === "valid");
    return guestKey || null;
  }, [guestKeys]);

  const getQuotaColor = useCallback((engineId: string): string => {
    const quota = getKeyQuotaStatus(engineId);
    switch (quota) {
      case "green": return "text-green-500";
      case "orange": return "text-orange-500";
      case "red": return "text-red-500";
      default: return "text-muted-foreground";
    }
  }, [getKeyQuotaStatus]);

  const showLimitMessage = useCallback((): string => {
    const browserLang = navigator.language.split("-")[0];
    return LIMIT_MESSAGES[browserLang] || LIMIT_MESSAGES.en;
  }, []);

  useEffect(() => {
    guestKeys.forEach((key) => {
      if (key.status === "checking") {
        checkKeyValidity(key.engineId);
      }
    });
  }, []);

  return (
    <GuestModeContext.Provider
      value={{
        isGuest,
        scanCount,
        maxScans: MAX_GUEST_SCANS,
        guestKeys,
        canScan,
        remainingScans,
        incrementScanCount,
        saveGuestKey,
        removeGuestKey,
        checkKeyValidity,
        getKeyQuotaStatus,
        getValidKey,
        getQuotaColor,
        showLimitMessage,
      }}
    >
      {children}
    </GuestModeContext.Provider>
  );
};

export const useGuestMode = () => {
  const ctx = useContext(GuestModeContext);
  if (!ctx) throw new Error("useGuestMode must be used within GuestModeProvider");
  return ctx;
};
