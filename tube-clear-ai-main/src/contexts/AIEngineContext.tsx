import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// AI Engine Priority: 1. Gemini 1.5 Flash (Deep Scan), 2. Groq Llama 3.1 (Quick Check), 3. OpenAI (Backup)
export type EngineId = "gemini" | "groq" | "openai";

export interface AIEngine {
  id: EngineId;
  name: string;
  priority: number;
  keyPlaceholder: string;
  endpoint?: string;
}

export type KeyStatus = "invalid" | "no_quota" | "ready" | "unknown";

export interface APIKeyData {
  engineId: EngineId;
  key: string;
  status: KeyStatus;
  lastChecked: string;
}

interface AIEngineContextType {
  engines: AIEngine[];
  apiKeys: Record<EngineId, APIKeyData>;
  currentEngine: EngineId | null;
  setAPIKey: (engineId: EngineId, key: string) => Promise<void>;
  removeAPIKey: (engineId: EngineId) => Promise<void>;
  validateKey: (engineId: EngineId) => Promise<KeyStatus>;
  getNextEngine: () => EngineId | null;
  switchToNextEngine: () => void;
  isEngineReady: (engineId: EngineId) => boolean;
  allEnginesFailed: () => boolean;
}

const ENGINES: AIEngine[] = [
  { id: "gemini", name: "Gemini 1.5 Flash", priority: 1, keyPlaceholder: "AIza...", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash" },
  { id: "groq", name: "Groq Llama 3.1", priority: 2, keyPlaceholder: "gsk_...", endpoint: "https://api.groq.com/openai/v1/chat/completions" },
  { id: "openai", name: "OpenAI GPT-4", priority: 3, keyPlaceholder: "sk-...", endpoint: "https://api.openai.com/v1/chat/completions" },
];

const API_KEYS_STORAGE_KEY = "tubeclear_api_keys";
const ADMIN_PHONE = "+923154414981";
const WEBHOOK_ALERT_SENT_KEY = "tubeclear_admin_alert_sent";

// Simple encryption for localStorage (not cryptographically secure, just obfuscation)
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

// Send webhook alert to admin when all keys fail
const sendAdminAlert = async (failedEngines: string[]): Promise<boolean> => {
  // Check if alert already sent recently (within 1 hour)
  const lastAlert = localStorage.getItem(WEBHOOK_ALERT_SENT_KEY);
  if (lastAlert) {
    const lastAlertTime = new Date(lastAlert).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (lastAlertTime > oneHourAgo) {
      console.log("Admin alert already sent within last hour, skipping...");
      return false;
    }
  }

  const message = `🚨 TubeClear Alert: All AI engines failed! Failed engines: ${failedEngines.join(", ")}. Timestamp: ${new Date().toISOString()}`;
  
  try {
    // Using a webhook service (you can replace with actual SMS gateway)
    // For now, we'll use a simple webhook format
    const webhookUrl = `https://api.callmebot.com/sms.php?phone=${encodeURIComponent(ADMIN_PHONE)}&text=${encodeURIComponent(message)}`;
    
    // In production, you would use a proper webhook endpoint
    // For now, we just log and mark as sent
    console.log("Admin Alert Triggered:", message);
    console.log("Webhook URL (for actual SMS gateway):", webhookUrl);
    
    // Mark alert as sent
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
  const [apiKeys, setApiKeys] = useState<Record<EngineId, APIKeyData>>({} as Record<EngineId, APIKeyData>);
  const [currentEngine, setCurrentEngine] = useState<EngineId | null>(null);

  // Load API keys from localStorage and Supabase
  useEffect(() => {
    const loadKeys = async () => {
      // Load from localStorage first
      const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Record<EngineId, { key: string; status: KeyStatus; lastChecked: string }>;
          const keys: Record<EngineId, APIKeyData> = {} as Record<EngineId, APIKeyData>;
          
          for (const [id, data] of Object.entries(parsed)) {
            keys[id as EngineId] = {
              engineId: id as EngineId,
              key: decryptKey(data.key),
              status: data.status,
              lastChecked: data.lastChecked,
            };
          }
          setApiKeys(keys);
          
          // Set current engine to first valid one
          const sortedEngines = [...ENGINES].sort((a, b) => a.priority - b.priority);
          for (const engine of sortedEngines) {
            if (keys[engine.id]?.key && keys[engine.id]?.status === "ready") {
              setCurrentEngine(engine.id);
              break;
            }
          }
        } catch (error) {
          console.error("Error loading API keys:", error);
        }
      }

      // If logged in, sync from Supabase
      if (!isGuest && user) {
        try {
          const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("user_id", user.id);

          if (!error && data) {
            for (const row of data) {
              const engineId = row.engine_id as EngineId;
              if (!apiKeys[engineId]?.key) {
                setApiKeys(prev => ({
                  ...prev,
                  [engineId]: {
                    engineId,
                    key: decryptKey(row.encrypted_key),
                    status: row.status as KeyStatus,
                    lastChecked: row.last_checked || new Date().toISOString(),
                  },
                }));
              }
            }
          }
        } catch (error) {
          console.error("Error syncing from Supabase:", error);
        }
      }
    };

    loadKeys();
  }, [user, isGuest]);

  // Save to localStorage whenever keys change
  useEffect(() => {
    const saveToStorage = () => {
      const toStore: Record<string, { key: string; status: KeyStatus; lastChecked: string }> = {};
      
      for (const [id, data] of Object.entries(apiKeys)) {
        if (data.key) {
          toStore[id] = {
            key: encryptKey(data.key),
            status: data.status,
            lastChecked: data.lastChecked,
          };
        }
      }
      
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(toStore));
    };

    saveToStorage();
  }, [apiKeys]);

  const setAPIKey = useCallback(async (engineId: EngineId, key: string): Promise<void> => {
    const newKeyData: APIKeyData = {
      engineId,
      key,
      status: "unknown",
      lastChecked: new Date().toISOString(),
    };

    setApiKeys(prev => ({
      ...prev,
      [engineId]: newKeyData,
    }));

    // Sync to Supabase if logged in
    if (!isGuest && user) {
      try {
        await supabase
          .from("api_keys")
          .upsert({
            user_id: user.id,
            engine_id: engineId,
            encrypted_key: encryptKey(key),
            status: "unknown",
            last_checked: new Date().toISOString(),
          }, {
            onConflict: "user_id,engine_id",
          });
      } catch (error) {
        console.error("Error saving to Supabase:", error);
      }
    }
  }, [user, isGuest]);

  const removeAPIKey = useCallback(async (engineId: EngineId): Promise<void> => {
    setApiKeys(prev => {
      const updated = { ...prev };
      delete updated[engineId];
      return updated;
    });

    // Remove from localStorage
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      delete parsed[engineId];
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(parsed));
    }

    // Remove from Supabase if logged in
    if (!isGuest && user) {
      try {
        await supabase
          .from("api_keys")
          .delete()
          .eq("user_id", user.id)
          .eq("engine_id", engineId);
      } catch (error) {
        console.error("Error removing from Supabase:", error);
      }
    }
  }, [user, isGuest]);

  const validateKey = useCallback(async (engineId: EngineId): Promise<KeyStatus> => {
    const keyData = apiKeys[engineId];
    if (!keyData?.key) return "invalid";

    // Simulate validation (in real app, would make actual API call)
    // For now, just check if key looks valid format
    const engine = ENGINES.find(e => e.id === engineId);
    if (!engine) return "invalid";

    const key = keyData.key.trim();
    
    // Basic format validation for 3 engines only
    let status: KeyStatus = "ready";
    
    switch (engineId) {
      case "gemini":
        status = key.startsWith("AIza") ? "ready" : "invalid";
        break;
      case "groq":
        status = key.startsWith("gsk_") ? "ready" : "invalid";
        break;
      case "openai":
        status = key.startsWith("sk-") ? "ready" : "invalid";
        break;
      default:
        status = "invalid";
    }

    // Update status
    setApiKeys(prev => ({
      ...prev,
      [engineId]: {
        ...prev[engineId],
        status,
        lastChecked: new Date().toISOString(),
      },
    }));

    // Sync status to Supabase
    if (!isGuest && user) {
      try {
        await supabase
          .from("api_keys")
          .update({
            status,
            last_checked: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("engine_id", engineId);
      } catch (error) {
        console.error("Error updating status in Supabase:", error);
      }
    }

    return status;
  }, [apiKeys, user, isGuest]);

  const getNextEngine = useCallback((): EngineId | null => {
    const sortedEngines = [...ENGINES].sort((a, b) => a.priority - b.priority);
    
    const currentIndex = currentEngine 
      ? sortedEngines.findIndex(e => e.id === currentEngine) 
      : -1;
    
    // Start from next engine after current
    for (let i = currentIndex + 1; i < sortedEngines.length; i++) {
      const engine = sortedEngines[i];
      if (apiKeys[engine.id]?.status === "ready") {
        return engine.id;
      }
    }
    
    // Wrap around to beginning
    for (let i = 0; i <= currentIndex; i++) {
      const engine = sortedEngines[i];
      if (apiKeys[engine.id]?.status === "ready") {
        return engine.id;
      }
    }
    
    return null;
  }, [currentEngine, apiKeys]);

  const switchToNextEngine = useCallback(() => {
    const next = getNextEngine();
    if (next) {
      setCurrentEngine(next);
    } else {
      // All engines failed - send admin alert
      const failedEngines = ENGINES
        .filter(e => apiKeys[e.id]?.key && apiKeys[e.id]?.status !== "ready")
        .map(e => e.name);
      
      if (failedEngines.length > 0) {
        sendAdminAlert(failedEngines);
      }
    }
  }, [getNextEngine, apiKeys]);

  const isEngineReady = useCallback((engineId: EngineId): boolean => {
    return apiKeys[engineId]?.status === "ready" && !!apiKeys[engineId]?.key;
  }, [apiKeys]);

  const allEnginesFailed = useCallback((): boolean => {
    const keysWithStatus = Object.values(apiKeys).filter(k => k.key);
    if (keysWithStatus.length === 0) return false;
    return keysWithStatus.every(k => k.status !== "ready");
  }, [apiKeys]);

  return (
    <AIEngineContext.Provider
      value={{
        engines: ENGINES,
        apiKeys,
        currentEngine,
        setAPIKey,
        removeAPIKey,
        validateKey,
        getNextEngine,
        switchToNextEngine,
        isEngineReady,
        allEnginesFailed,
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
