import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// AI Engine Priority: 1. Gemini (Visual/Video scan), 2. Groq (Policy Auditing)
export type EngineId = "gemini" | "groq";

export interface AIEngine {
  id: EngineId;
  name: string;
  role: "visual" | "policy";
  priority: number;
  keyPlaceholder: string;
  endpoint?: string;
}

export type KeyStatus = "invalid" | "no_quota" | "ready" | "unknown";

export interface APIKeyEntry {
  id: string; // Unique ID for each key
  key: string;
  status: KeyStatus;
  lastChecked: string;
  lastUsed?: string;
  usageCount: number;
  isExhausted: boolean; // True when hit rate limit
}

export interface EnginePool {
  engineId: EngineId;
  keys: APIKeyEntry[];
  activeKeyIndex: number; // Current working key
}

interface AIEngineContextType {
  engines: AIEngine[];
  pools: Record<EngineId, EnginePool>;
  currentEngine: EngineId | null;
  activeKey: APIKeyEntry | null;
  
  // Multi-key management
  addKey: (engineId: EngineId, key: string) => Promise<void>;
  removeKey: (engineId: EngineId, keyId: string) => Promise<void>;
  validateKey: (engineId: EngineId, keyId?: string) => Promise<KeyStatus>;
  
  // Pool rotation
  getNextAvailableKey: (engineId: EngineId) => APIKeyEntry | null;
  markKeyExhausted: (engineId: EngineId, keyId: string) => void;
  rotateToNextKey: (engineId: EngineId) => boolean;
  
  // Universal access
  getActiveKeyForScan: (scanType: "visual" | "policy") => APIKeyEntry | null;
  isAnyKeyAvailable: (engineId: EngineId) => boolean;
  allPoolsExhausted: () => boolean;
  checkPoolHealth: () => { gemini: boolean; groq: boolean; totalKeys: number; activeKeys: number };
}

const ENGINES: AIEngine[] = [
  { 
    id: "gemini", 
    name: "Gemini 1.5 Flash", 
    role: "visual",
    priority: 1, 
    keyPlaceholder: "AIza...", 
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash" 
  },
  { 
    id: "groq", 
    name: "Groq Llama 3.1", 
    role: "policy",
    priority: 2, 
    keyPlaceholder: "gsk_...", 
    endpoint: "https://api.groq.com/openai/v1/chat/completions" 
  },
];

const API_KEYS_STORAGE_KEY = "tubeclear_api_keys_v2";
const ADMIN_PHONE = "+923154414981";
const WEBHOOK_ALERT_SENT_KEY = "tubeclear_admin_alert_sent";

// Simple encryption for localStorage
const encryptKey = (key: string): string => {
  return btoa(encodeURIComponent(key));
};

const decryptKey = (encrypted: string): string => {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return "";
  }
};

// Generate unique key ID
const generateKeyId = (): string => {
  return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Send webhook alert to admin when all keys fail
const sendAdminAlert = async (failedEngines: string[]): Promise<boolean> => {
  const lastAlert = localStorage.getItem(WEBHOOK_ALERT_SENT_KEY);
  if (lastAlert) {
    const lastAlertTime = new Date(lastAlert).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (lastAlertTime > oneHourAgo) {
      console.log("Admin alert already sent within last hour, skipping...");
      return false;
    }
  }

  const message = `🚨 TubeClear Alert: All API keys exhausted! Failed engines: ${failedEngines.join(", ")}. Timestamp: ${new Date().toISOString()}`;
  
  try {
    console.log("Admin Alert Triggered:", message);
    localStorage.setItem(WEBHOOK_ALERT_SENT_KEY, new Date().toISOString());
    return true;
  } catch (error) {
    console.error("Error sending admin alert:", error);
    return false;
  }
};

const AIEngineContext = createContext<AIEngineContextType | undefined>(undefined);

export const AIEngineProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const [pools, setPools] = useState<Record<EngineId, EnginePool>>({} as Record<EngineId, EnginePool>);
  const [currentEngine, setCurrentEngine] = useState<EngineId | null>(null);
  const [activeKey, setActiveKey] = useState<APIKeyEntry | null>(null);

  // Initialize pools
  useEffect(() => {
    const initialPools: Record<EngineId, EnginePool> = {} as Record<EngineId, EnginePool>;
    for (const engine of ENGINES) {
      initialPools[engine.id] = {
        engineId: engine.id,
        keys: [],
        activeKeyIndex: 0
      };
    }
    setPools(initialPools);
  }, []);

  // Load API key pools from localStorage
  useEffect(() => {
    const loadPools = async () => {
      const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Record<EngineId, { keys: Array<{id: string; key: string; status: KeyStatus; lastChecked: string; usageCount: number; isExhausted: boolean}>; activeKeyIndex: number }>;
          const loadedPools: Record<EngineId, EnginePool> = {} as Record<EngineId, EnginePool>;
          
          for (const engine of ENGINES) {
            const engineData = parsed[engine.id];
            if (engineData && engineData.keys.length > 0) {
              loadedPools[engine.id] = {
                engineId: engine.id,
                keys: engineData.keys.map(k => ({
                  ...k,
                  key: decryptKey(k.key),
                  lastUsed: k.lastUsed,
                })),
                activeKeyIndex: engineData.activeKeyIndex || 0
              };
            } else {
              loadedPools[engine.id] = {
                engineId: engine.id,
                keys: [],
                activeKeyIndex: 0
              };
            }
          }
          
          setPools(loadedPools);
          
          // Set current engine to first available
          for (const engine of ENGINES) {
            const pool = loadedPools[engine.id];
            if (pool.keys.some(k => !k.isExhausted && k.status === "ready")) {
              setCurrentEngine(engine.id);
              break;
            }
          }
        } catch (error) {
          console.error("Error loading API key pools:", error);
        }
      }
    };

    loadPools();
  }, []);

  // Save pools to localStorage whenever they change
  useEffect(() => {
    const savePools = () => {
      const toStore: any = {};
      
      for (const [id, pool] of Object.entries(pools)) {
        if (pool.keys.length > 0) {
          toStore[id] = {
            keys: pool.keys.map(k => ({
              id: k.id,
              key: encryptKey(k.key),
              status: k.status,
              lastChecked: k.lastChecked,
              usageCount: k.usageCount,
              isExhausted: k.isExhausted
            })),
            activeKeyIndex: pool.activeKeyIndex
          };
        }
      }
      
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(toStore));
    };

    if (Object.keys(pools).length > 0) {
      savePools();
    }
  }, [pools]);

  // Add new key to pool
  const addKey = useCallback(async (engineId: EngineId, key: string): Promise<void> => {
    const newKeyEntry: APIKeyEntry = {
      id: generateKeyId(),
      key,
      status: "unknown",
      lastChecked: new Date().toISOString(),
      usageCount: 0,
      isExhausted: false
    };

    setPools(prev => ({
      ...prev,
      [engineId]: {
        ...prev[engineId],
        keys: [...prev[engineId].keys, newKeyEntry]
      }
    }));
  }, []);

  // Remove key from pool
  const removeKey = useCallback(async (engineId: EngineId, keyId: string): Promise<void> => {
    setPools(prev => ({
      ...prev,
      [engineId]: {
        ...prev[engineId],
        keys: prev[engineId].keys.filter(k => k.id !== keyId)
      }
    }));
  }, []);

  // Validate a specific key or all keys
  const validateKey = useCallback(async (engineId: EngineId, keyId?: string): Promise<KeyStatus> => {
    const pool = pools[engineId];
    if (!pool) return "invalid";

    const keysToValidate = keyId ? pool.keys.filter(k => k.id === keyId) : pool.keys;
    
    for (const keyData of keysToValidate) {
      const key = keyData.key.trim();
      let status: KeyStatus = "ready";
      
      // Basic format validation
      switch (engineId) {
        case "gemini":
          status = key.startsWith("AIza") ? "ready" : "invalid";
          break;
        case "groq":
          status = key.startsWith("gsk_") ? "ready" : "invalid";
          break;
        default:
          status = "invalid";
      }

      // Update key status
      setPools(prev => ({
        ...prev,
        [engineId]: {
          ...prev[engineId],
          keys: prev[engineId].keys.map(k => 
            k.id === keyData.id 
              ? { ...k, status, lastChecked: new Date().toISOString() }
              : k
          )
        }
      }));
    }

    return keysToValidate[0]?.status || "invalid";
  }, [pools]);

  // Get next available (non-exhausted) key
  const getNextAvailableKey = useCallback((engineId: EngineId): APIKeyEntry | null => {
    const pool = pools[engineId];
    if (!pool || pool.keys.length === 0) return null;

    // Start from active key index and search
    for (let i = 0; i < pool.keys.length; i++) {
      const index = (pool.activeKeyIndex + i) % pool.keys.length;
      const key = pool.keys[index];
      
      if (!key.isExhausted && key.status === "ready") {
        return key;
      }
    }

    return null;
  }, [pools]);

  // Mark key as exhausted (rate limited)
  const markKeyExhausted = useCallback((engineId: EngineId, keyId: string) => {
    setPools(prev => ({
      ...prev,
      [engineId]: {
        ...prev[engineId],
        keys: prev[engineId].keys.map(k =>
          k.id === keyId ? { ...k, isExhausted: true } : k
        )
      }
    }));
  }, []);

  // Rotate to next available key
  const rotateToNextKey = useCallback((engineId: EngineId): boolean => {
    const pool = pools[engineId];
    if (!pool || pool.keys.length === 0) return false;

    // Find next non-exhausted key
    for (let i = 0; i < pool.keys.length; i++) {
      const nextIndex = (pool.activeKeyIndex + 1 + i) % pool.keys.length;
      const nextKey = pool.keys[nextIndex];

      if (!nextKey.isExhausted && nextKey.status === "ready") {
        setPools(prev => ({
          ...prev,
          [engineId]: {
            ...prev[engineId],
            activeKeyIndex: nextIndex
          }
        }));
        return true;
      }
    }

    return false;
  }, [pools]);

  // Get active key for scan type (hybrid roles)
  const getActiveKeyForScan = useCallback((scanType: "visual" | "policy"): APIKeyEntry | null => {
    const targetEngine = scanType === "visual" ? "gemini" : "groq";
    return getNextAvailableKey(targetEngine);
  }, [getNextAvailableKey]);

  // Check if any key is available for engine
  const isAnyKeyAvailable = useCallback((engineId: EngineId): boolean => {
    const pool = pools[engineId];
    if (!pool || pool.keys.length === 0) return false;
    return pool.keys.some(k => !k.isExhausted && k.status === "ready");
  }, [pools]);

  // Check if all pools are exhausted
  const allPoolsExhausted = useCallback((): boolean => {
    for (const pool of Object.values(pools)) {
      if (pool.keys.some(k => !k.isExhausted && k.status === "ready")) {
        return false;
      }
    }
    return Object.keys(pools).length > 0;
  }, [pools]);

  // Check pool health
  const checkPoolHealth = useCallback(() => {
    const geminiPool = pools.gemini;
    const groqPool = pools.groq;

    const totalKeys = (geminiPool?.keys.length || 0) + (groqPool?.keys.length || 0);
    const activeKeys = (geminiPool?.keys.filter(k => !k.isExhausted && k.status === "ready").length || 0) +
                       (groqPool?.keys.filter(k => !k.isExhausted && k.status === "ready").length || 0);

    return {
      gemini: geminiPool?.keys.some(k => !k.isExhausted && k.status === "ready") || false,
      groq: groqPool?.keys.some(k => !k.isExhausted && k.status === "ready") || false,
      totalKeys,
      activeKeys
    };
  }, [pools]);

  return (
    <AIEngineContext.Provider
      value={{
        engines: ENGINES,
        pools,
        currentEngine,
        activeKey,
        addKey,
        removeKey,
        validateKey,
        getNextAvailableKey,
        markKeyExhausted,
        rotateToNextKey,
        getActiveKeyForScan,
        isAnyKeyAvailable,
        allPoolsExhausted,
        checkPoolHealth,
      }}
    >
      {children}
    </AIEngineContext.Provider>
  );
};

export const useAIEngines = () => {
  const ctx = useContext(AIEngineContext);
  if (!ctx) throw new Error("useAIEngines must be used within AIEngineProvider");
  return ctx;
};
