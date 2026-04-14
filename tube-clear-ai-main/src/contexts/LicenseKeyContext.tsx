import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

// License key types for different services
export type LicenseKeyType = 
  | "gemini_api"        // Google Gemini API
  | "openai_api"        // OpenAI API
  | "claude_api"        // Anthropic Claude API
  | "vision_api"        // Vision/Frame analysis API
  | "audio_api"         // Audio/Music detection API
  | "custom_api";       // Custom API endpoint

export interface LicenseKey {
  id: string;
  type: LicenseKeyType;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface LicenseKeyContextType {
  keys: LicenseKey[];
  addKey: (type: LicenseKeyType, key: string, name: string) => Promise<boolean>;
  removeKey: (id: string) => Promise<boolean>;
  toggleKey: (id: string) => Promise<boolean>;
  getActiveKey: (type: LicenseKeyType) => LicenseKey | undefined;
  hasActiveKey: (type: LicenseKeyType) => boolean;
  getKeyCount: () => number;
}

const LICENSE_KEYS_STORAGE = "tubeclear_license_keys";

const LicenseKeyContext = createContext<LicenseKeyContextType | undefined>(undefined);

export const LicenseKeyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<LicenseKey[]>([]);

  // Load keys from localStorage on mount
  useEffect(() => {
    loadKeys();
  }, [user]);

  const getStorageKey = useCallback(() => {
    return user ? `${LICENSE_KEYS_STORAGE}_${user.id}` : LICENSE_KEYS_STORAGE;
  }, [user]);

  const loadKeys = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setKeys(parsed);
      }
    } catch (error) {
      console.error("Error loading license keys:", error);
      setKeys([]);
    }
  }, [getStorageKey]);

  const saveKeys = useCallback((newKeys: LicenseKey[]) => {
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(newKeys));
      setKeys(newKeys);
    } catch (error) {
      console.error("Error saving license keys:", error);
      return false;
    }
    return true;
  }, [getStorageKey]);

  const addKey = useCallback(async (
    type: LicenseKeyType,
    key: string,
    name: string
  ): Promise<boolean> => {
    try {
      const newKey: LicenseKey = {
        id: crypto.randomUUID(),
        type,
        key: key.trim(),
        name: name.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      const newKeys = [newKey, ...keys];
      return saveKeys(newKeys);
    } catch (error) {
      console.error("Error adding license key:", error);
      return false;
    }
  }, [keys, saveKeys]);

  const removeKey = useCallback(async (id: string): Promise<boolean> => {
    try {
      const newKeys = keys.filter(k => k.id !== id);
      return saveKeys(newKeys);
    } catch (error) {
      console.error("Error removing license key:", error);
      return false;
    }
  }, [keys, saveKeys]);

  const toggleKey = useCallback(async (id: string): Promise<boolean> => {
    try {
      const newKeys = keys.map(k => 
        k.id === id ? { ...k, isActive: !k.isActive } : k
      );
      return saveKeys(newKeys);
    } catch (error) {
      console.error("Error toggling license key:", error);
      return false;
    }
  }, [keys, saveKeys]);

  const getActiveKey = useCallback((type: LicenseKeyType): LicenseKey | undefined => {
    return keys.find(k => k.type === type && k.isActive);
  }, [keys]);

  const hasActiveKey = useCallback((type: LicenseKeyType): boolean => {
    return keys.some(k => k.type === type && k.isActive);
  }, [keys]);

  const getKeyCount = useCallback((): number => {
    return keys.filter(k => k.isActive).length;
  }, [keys]);

  return (
    <LicenseKeyContext.Provider
      value={{
        keys,
        addKey,
        removeKey,
        toggleKey,
        getActiveKey,
        hasActiveKey,
        getKeyCount,
      }}
    >
      {children}
    </LicenseKeyContext.Provider>
  );
};

export const useLicenseKeys = () => {
  const ctx = useContext(LicenseKeyContext);
  if (!ctx) throw new Error("useLicenseKeys must be used within LicenseKeyProvider");
  return ctx;
};
