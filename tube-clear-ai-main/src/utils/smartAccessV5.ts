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

// AI Engine Cost Configuration (Package Rates)
// Aap yahan se rates change kar sakte hain agar AI mehnga hota hai
const AI_RATES = {
  PRE_SCAN_BASE: 5,       // Metadata check base coins
  DEEP_SCAN_PER_MIN: 12,  // Video/Audio analysis per minute
  ADMIN_MARGIN: 1.2,      // 20% margin for your profit/safety
  MIN_SCAN_COST: 10       // Minimum cost for any scan
};

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
  // Automatic calculation based on AI_RATES
  let baseCost = AI_RATES.PRE_SCAN_BASE + (durationMinutes * AI_RATES.DEEP_SCAN_PER_MIN);
  
  // Apply safety margin (Admin profit/buffer)
  let finalCost = Math.ceil(baseCost * AI_RATES.ADMIN_MARGIN);

  // Ensure minimum cost
  if (finalCost < AI_RATES.MIN_SCAN_COST) {
    finalCost = AI_RATES.MIN_SCAN_COST;
  }

  // Detect VPN/Tier 1 location
  const multiplier = 1; // Default multiplier

  return {
    tier: "Standard",
    multiplier,
    baseCost: Math.ceil(baseCost),
    finalCost,
    isVPN: false,
    isCached: false,
    isOverLimit: false,
  };
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
  // Enforce 360p for all scans to maximize token efficiency as requested
  console.info("⚡ Applying 360p optimization for token efficiency");
  return true;
};
