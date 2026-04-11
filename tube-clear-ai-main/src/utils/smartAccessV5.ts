/**
 * Optimized Dynamic Smart Access V5 - Pricing & Coin Logic
 */

export interface PricingResult {
  tier: string;
  multiplier: number;
  baseCost: number;
  finalCost: number;
  isVPN: boolean;
  isCached: boolean;
  isOverLimit: boolean;
}

/**
 * Calculate smart pricing based on duration and location
 */
export const calculateSmartPricing = (durationSeconds: number): PricingResult => {
  const durationMinutes = Math.ceil(durationSeconds / 60);
  
  // Hard limit check
  if (durationMinutes > 60) {
    return {
      tier: "Blocked",
      multiplier: 0,
      baseCost: 0,
      finalCost: 0,
      isVPN: false,
      isCached: false,
      isOverLimit: true,
    };
  }

  // Base cost tiers
  let baseCost = 0;
  if (durationMinutes < 5) {
    baseCost = 15;
  } else if (durationMinutes <= 15) {
    baseCost = 35;
  } else if (durationMinutes <= 30) {
    baseCost = 80;
  } else if (durationMinutes <= 60) {
    baseCost = 150;
  }

  // Detect VPN/Tier 1 location
  const isVPN = detectTier1Location();
  const multiplier = isVPN ? 2.5 : 1;
  const finalCost = Math.ceil(baseCost * multiplier);

  // Check 24hr cache
  const cacheKey = `tubeclear_cache_check`;
  const isCached = false; // Will be checked separately with URL

  return {
    tier: isVPN ? "Tier 1 / VPN" : "Standard",
    multiplier,
    baseCost,
    finalCost,
    isVPN,
    isCached,
    isOverLimit: false,
  };
};

/**
 * Detect if user is in Tier 1 location (US/UK) or using VPN
 * In production, use IP geolocation API
 */
const detectTier1Location = (): boolean => {
  try {
    // Check timezone offset as heuristic
    const timezoneOffset = new Date().getTimezoneOffset();
    // US: -300 to -600, UK: 0
    return timezoneOffset >= -600 && timezoneOffset <= 0;
  } catch {
    return false;
  }
};

/**
 * Check if URL was scanned in last 24 hours
 */
export const check24HrCache = (videoUrl: string): boolean => {
  try {
    const cacheKey = `tubeclear_cache_${btoa(videoUrl)}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return false;

    const { timestamp } = JSON.parse(cached);
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    return hoursSince < 24;
  } catch {
    return false;
  }
};

/**
 * Mark URL as scanned (for 24hr cache)
 */
export const markAsScanned = (videoUrl: string): void => {
  try {
    const cacheKey = `tubeclear_cache_${btoa(videoUrl)}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      url: videoUrl,
    }));
  } catch (error) {
    console.error("Failed to cache scan:", error);
  }
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('tubeclear_cache_')) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
          if (hoursSince >= 24) {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} expired cache entries`);
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

/**
 * Process coin deduction with refund capability
 */
export const processCoinTransaction = async (
  spendCoins: (amount: number, description: string) => Promise<boolean>,
  refundCoins: (amount: number, description: string) => Promise<void>,
  amount: number,
  scanFunction: () => Promise<boolean>
): Promise<boolean> => {
  try {
    // Deduct coins
    const deducted = await spendCoins(amount, `Video scan (${Math.ceil(amount / 60)} min)`);
    
    if (!deducted) {
      throw new Error("Insufficient coins");
    }

    // Execute scan
    const scanSuccess = await scanFunction();

    if (!scanSuccess) {
      // Refund if scan failed
      await refundCoins(amount, "Scan failed - automatic refund");
      throw new Error("Scan failed - coins refunded");
    }

    return true;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
};

/**
 * Apply 360p optimization for long videos
 */
export const apply360pOptimization = (durationSeconds: number): boolean => {
  // Force 360p for videos over 30 minutes
  return durationSeconds > 1800;
};
