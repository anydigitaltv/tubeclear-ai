/**
 * AI API Rotation Wrapper
 * 
 * Provides automatic key rotation on 429 errors and seamless failover.
 * Works with the Infinite API Pool system for unlimited scanning.
 */

import { useAIEngines, type EngineId, type APIKeyEntry } from "@/contexts/AIEngineContext";

// Maximum rotation attempts before giving up
const MAX_ROTATION_ATTEMPTS = 100;

export interface RotationCallResult {
  success: boolean;
  data?: any;
  error?: string;
  keyUsed?: APIKeyEntry;
  rotationsCount?: number;
}

/**
 * Call AI API with automatic rotation on rate limit errors
 * 
 * @param scanType - "visual" for Gemini, "policy" for Groq
 * @param makeCall - Function that makes the actual API call
 * @returns Result with data or error
 */
export const callAIWithRotation = async (
  scanType: "visual" | "policy",
  makeCall: (apiKey: string) => Promise<any>
): Promise<RotationCallResult> => {
  // This function should not be used directly
  // Use useAIWithRotation hook in components instead
  throw new Error("Use useAIWithRotation hook instead of callAIWithRotation");
};

/**
 * React hook for AI calls with rotation
 * Use this in components instead of calling API directly
 */
export const useAIWithRotation = () => {
  const { 
    getActiveKeyForScan, 
    markKeyExhausted, 
    rotateToNextKey, 
    allPoolsExhausted,
    checkPoolHealth
  } = useAIEngines();

  const executeWithRotation = async (
    scanType: "visual" | "policy",
    makeCall: (apiKey: string) => Promise<any>
  ): Promise<RotationCallResult> => {
    let attempts = 0;
    let rotationsCount = 0;

    while (attempts < MAX_ROTATION_ATTEMPTS) {
      // Check if any keys are available
      if (allPoolsExhausted()) {
        return {
          success: false,
          error: "ALL_KEYS_EXHAUSTED",
          rotationsCount
        };
      }

      // Get next available key
      const activeKey = getActiveKeyForScan(scanType);
      
      if (!activeKey) {
        return {
          success: false,
          error: "NO_AVAILABLE_KEY",
          rotationsCount
        };
      }

      try {
        // Make the API call
        const result = await makeCall(activeKey.key);
        
        // Success - update usage count
        updateKeyUsage(activeKey.id);
        
        return {
          success: true,
          data: result,
          keyUsed: activeKey,
          rotationsCount
        };
        
      } catch (error: any) {
        // Check if it's a rate limit error
        const isRateLimit = error.status === 429 || 
                            error.message?.includes("429") ||
                            error.message?.includes("rate limit") ||
                            error.message?.includes("quota exceeded");
        
        if (isRateLimit) {
          console.warn(`Key ${activeKey.id.slice(-4)} hit rate limit, rotating...`);
          
          // Mark this key as exhausted
          const targetEngine = scanType === "visual" ? "gemini" : "groq";
          markKeyExhausted(targetEngine, activeKey.id);
          
          // Try to rotate to next key
          const rotated = rotateToNextKey(targetEngine);
          
          if (!rotated) {
            // No more keys available
            return {
              success: false,
              error: "ALL_KEYS_EXHAUSTED",
              rotationsCount
            };
          }
          
          rotationsCount++;
          attempts++;
          continue;
        }
        
        // Other error - throw immediately
        throw error;
      }
    }

    return {
      success: false,
      error: "MAX_ROTATIONS_REACHED",
      rotationsCount
    };
  };

  return {
    executeWithRotation,
    checkPoolHealth
  };
};

/**
 * Update key usage count in localStorage
 */
const updateKeyUsage = (keyId: string) => {
  const API_KEYS_STORAGE_KEY = "tubeclear_api_keys_v2";
  
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!stored) return;
    
    const pools: any = JSON.parse(stored);
    
    // Find and update the key
    for (const [engineId, pool] of Object.entries(pools)) {
      const keyPool = pool as any;
      const keyIndex = keyPool.keys.findIndex((k: any) => k.id === keyId);
      if (keyIndex !== -1) {
        keyPool.keys[keyIndex].usageCount = (keyPool.keys[keyIndex].usageCount || 0) + 1;
        keyPool.keys[keyIndex].lastUsed = new Date().toISOString();
        break;
      }
    }
    
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(pools));
  } catch (error) {
    console.error("Error updating key usage:", error);
  }
};

/**
 * Pre-scan handshake check
 * Returns true if scan can proceed, false if all keys are exhausted
 */
export const canPerformScan = (): {
  canScan: boolean;
  gemini: boolean;
  groq: boolean;
  totalKeys: number;
  activeKeys: number;
} => {
  const API_KEYS_STORAGE_KEY = "tubeclear_api_keys_v2";
  
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!stored) {
      return { canScan: false, gemini: false, groq: false, totalKeys: 0, activeKeys: 0 };
    }
    
    const pools = JSON.parse(stored);
    
    let geminiActive = false;
    let groqActive = false;
    let totalKeys = 0;
    let activeKeys = 0;
    
    // Check Gemini pool
    if (pools.gemini?.keys) {
      totalKeys += pools.gemini.keys.length;
      const geminiAvailable = pools.gemini.keys.filter((k: any) => !k.isExhausted && k.status === "ready");
      activeKeys += geminiAvailable.length;
      geminiActive = geminiAvailable.length > 0;
    }
    
    // Check Groq pool
    if (pools.groq?.keys) {
      totalKeys += pools.groq.keys.length;
      activeKeys += pools.groq.keys.filter((k: any) => !k.isExhausted && k.status === "ready").length;
      groqActive = pools.groq.keys.some((k: any) => !k.isExhausted && k.status === "ready");
    }
    
    return {
      canScan: activeKeys > 0,
      gemini: geminiActive,
      groq: groqActive,
      totalKeys,
      activeKeys
    };
  } catch (error) {
    console.error("Error checking pool health:", error);
    return { canScan: false, gemini: false, groq: false, totalKeys: 0, activeKeys: 0 };
  }
};
