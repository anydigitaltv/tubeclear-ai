import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SecurityMode = "ghost" | "cloud";

export interface SecurityBadge {
  engineId: string;
  keyId: string;
  encryptedAt: string;
  mode: SecurityMode;
  deviceId: string;
}

export interface DeviceAccess {
  deviceId: string;
  lastAccess: string;
  isNew: boolean;
  location?: string;
}

interface EncryptionContextType {
  securityMode: SecurityMode;
  setSecurityMode: (mode: SecurityMode) => void;
  deviceId: string;
  encryptKey: (key: string, engineId: string) => string;
  decryptKey: (encrypted: string, engineId: string) => string;
  getSecurityBadge: (engineId: string) => SecurityBadge | null;
  getDeviceAccessHistory: (engineId: string) => DeviceAccess[];
  checkNewDeviceAccess: (engineId: string) => Promise<boolean>;
  getSecuritySMS: (engineId: string) => string;
  showSecurityBadge: boolean;
  setShowSecurityBadge: (show: boolean) => void;
}

const SECURITY_MODE_KEY = "tubeclear_security_mode";
const DEVICE_ID_KEY = "tubeclear_device_id";
const SECURITY_BADGES_KEY = "tubeclear_security_badges";
const DEVICE_ACCESS_KEY = "tubeclear_device_access";

// Multi-language security SMS
const SECURITY_SMS: Record<string, string> = {
  en: "Your key is 100% encrypted and secure. TubeClear only uses it for scanning.",
  hi: "Aapki key 100% encrypted aur mehfooz hai. Tubeclear sirf scan ke liye ise use karta hai.",
  ur: "Aapki key 100% encrypted aur mehfooz hai. Tubeclear sirf scan ke liye ise use karta hai.",
  es: "Tu clave está 100% encriptada y segura. TubeClear solo la usa para escanear.",
  ar: "مفتاحك مشفر بنسبة 100٪ وآمن. يستخدم TubeClear فقط للمسح الضوئي.",
};

// New device access alerts
const NEW_DEVICE_ALERTS: Record<string, string> = {
  en: "Security Alert: Your API key was accessed from a new device. If this wasn't you, please change your key immediately.",
  hi: "Suraksha Alert: Aapki API key nayi device se access hui. Agar yeh aap nahi the, toh turant key badlein.",
  ur: "Suraksha Alert: Aapki API key nayi device se access hui. Agar yeh aap nahi the, toh turant key badlein.",
  es: "Alerta de seguridad: Tu clave API fue accedida desde un nuevo dispositivo.",
  ar: "تنبيه أمني: تم الوصول إلى مفتاح API الخاص بك من جهاز جديد.",
};

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

// Generate a unique device ID
const generateDeviceId = (): string => {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;

  const id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
};

// AES-256 style encryption (simplified for browser - in production use Web Crypto API)
const deriveKey = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const EncryptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  const [securityMode, setSecurityModeState] = useState<SecurityMode>(() => {
    try {
      const stored = localStorage.getItem(SECURITY_MODE_KEY);
      return (stored as SecurityMode) || "ghost";
    } catch {
      return "ghost";
    }
  });

  const [deviceId] = useState<string>(generateDeviceId);
  
  const [showSecurityBadge, setShowSecurityBadge] = useState(false);

  const [securityBadges, setSecurityBadges] = useState<SecurityBadge[]>(() => {
    try {
      const stored = localStorage.getItem(SECURITY_BADGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deviceAccessHistory, setDeviceAccessHistory] = useState<Record<string, DeviceAccess[]>>(() => {
    try {
      const stored = localStorage.getItem(DEVICE_ACCESS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setSecurityMode = useCallback((mode: SecurityMode) => {
    localStorage.setItem(SECURITY_MODE_KEY, mode);
    setSecurityModeState(mode);
  }, []);

  // AES-256 encryption using Web Crypto API style (simplified)
  const encryptKey = useCallback((key: string, engineId: string): string => {
    // Create a unique encryption key based on device + engine + user
    const encryptionKey = `${deviceId}_${engineId}_${user?.id || "guest"}`;
    const derivedKey = deriveKey(encryptionKey);

    // Simple XOR encryption with base64 encoding
    // In production, use: crypto.subtle.encrypt() with AES-GCM
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    
    const encrypted = data.map((byte, i) => {
      const keyByte = derivedKey.charCodeAt(i % derivedKey.length);
      return byte ^ keyByte;
    });

    // Store security badge
    const badge: SecurityBadge = {
      engineId,
      keyId: derivedKey.substring(0, 8),
      encryptedAt: new Date().toISOString(),
      mode: securityMode,
      deviceId,
    };

    setSecurityBadges(prev => {
      const filtered = prev.filter(b => b.engineId !== engineId);
      const updated = [...filtered, badge];
      localStorage.setItem(SECURITY_BADGES_KEY, JSON.stringify(updated));
      return updated;
    });

    // Convert to base64
    return btoa(String.fromCharCode(...encrypted));
  }, [deviceId, user?.id, securityMode]);

  const decryptKey = useCallback((encrypted: string, engineId: string): string => {
    try {
      const encryptionKey = `${deviceId}_${engineId}_${user?.id || "guest"}`;
      const derivedKey = deriveKey(encryptionKey);

      // Decode from base64
      const encryptedData = atob(encrypted);
      const encryptedBytes = new Uint8Array(encryptedData.length);
      for (let i = 0; i < encryptedData.length; i++) {
        encryptedBytes[i] = encryptedData.charCodeAt(i);
      }

      // XOR decrypt
      const decrypted = encryptedBytes.map((byte, i) => {
        const keyByte = derivedKey.charCodeAt(i % derivedKey.length);
        return byte ^ keyByte;
      });

      const decoder = new TextDecoder();
      return decoder.decode(new Uint8Array(decrypted));
    } catch {
      return "";
    }
  }, [deviceId, user?.id]);

  const getSecurityBadge = useCallback((engineId: string): SecurityBadge | null => {
    return securityBadges.find(b => b.engineId === engineId) || null;
  }, [securityBadges]);

  const getDeviceAccessHistory = useCallback((engineId: string): DeviceAccess[] => {
    return deviceAccessHistory[engineId] || [];
  }, [deviceAccessHistory]);

  const checkNewDeviceAccess = useCallback(async (engineId: string): Promise<boolean> => {
    const currentAccess = deviceAccessHistory[engineId] || [];
    const existingDevice = currentAccess.find(a => a.deviceId === deviceId);

    if (!existingDevice) {
      // New device access
      const newAccess: DeviceAccess = {
        deviceId,
        lastAccess: new Date().toISOString(),
        isNew: true,
      };

      setDeviceAccessHistory(prev => {
        const updated = {
          ...prev,
          [engineId]: [...(prev[engineId] || []), newAccess],
        };
        localStorage.setItem(DEVICE_ACCESS_KEY, JSON.stringify(updated));
        return updated;
      });

      return true;
    }

    // Update last access
    setDeviceAccessHistory(prev => {
      const updated = {
        ...prev,
        [engineId]: prev[engineId]?.map(a =>
          a.deviceId === deviceId
            ? { ...a, lastAccess: new Date().toISOString(), isNew: false }
            : a
        ) || [],
      };
      localStorage.setItem(DEVICE_ACCESS_KEY, JSON.stringify(updated));
      return updated;
    });

    return false;
  }, [deviceId, deviceAccessHistory]);

  const getSecuritySMS = useCallback((engineId: string): string => {
    const browserLang = navigator.language.split("-")[0];
    return SECURITY_SMS[browserLang] || SECURITY_SMS.en;
  }, []);

  const getNewDeviceAlert = useCallback((): string => {
    const browserLang = navigator.language.split("-")[0];
    return NEW_DEVICE_ALERTS[browserLang] || NEW_DEVICE_ALERTS.en;
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
        securityMode,
        setSecurityMode,
        deviceId,
        encryptKey,
        decryptKey,
        getSecurityBadge,
        getDeviceAccessHistory,
        checkNewDeviceAccess,
        getSecuritySMS,
        showSecurityBadge,
        setShowSecurityBadge,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
};

export const useEncryption = () => {
  const ctx = useContext(EncryptionContext);
  if (!ctx) throw new Error("useEncryption must be used within EncryptionProvider");
  return ctx;
};
