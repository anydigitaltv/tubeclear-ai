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
