/**
 * Dynamic Pricing Configuration System
 * Admin can update coin prices based on AI engine costs
 * Prices automatically adjust when AI providers change their rates
 */

export interface PricingTier {
  name: string;
  maxDurationSeconds: number; // 0 = unlimited (for max tier)
  baseCoins: number;
  description: string;
}

export interface AIEnginePricing {
  engineId: string;
  pricePer1KTokens: number; // USD
  avgTokensPerScan: number;
  lastUpdated: string;
  isAutoSync: boolean;
}

export interface PricingConfig {
  version: number;
  lastUpdated: string;
  currency: string;
  coinValueInUSD: number; // 1 coin = $X USD
  
  // Pricing tiers based on video duration
  tiers: PricingTier[];
  
  // AI engine pricing (for auto-calculation)
  engines: {
    gemini: AIEnginePricing;
    groq: AIEnginePricing;
  };
  
  // Admin multiplier (optional, for profit margin)
  adminMultiplier: number; // 1.0 = no markup, 1.5 = 50% markup
  
  // Price change notification
  lastPriceChange?: {
    date: string;
    reason: string;
    oldPrices: PricingTier[];
    newPrices: PricingTier[];
  };
}

// Default pricing configuration - UPDATED FOR FULL VIDEO ANALYSIS
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: 2,
  lastUpdated: new Date().toISOString(),
  currency: "USD",
  coinValueInUSD: 0.001, // 1 coin = $0.001 (1000 coins = $1)
  
  tiers: [
    {
      name: "Short",
      maxDurationSeconds: 60, // < 1 minute
      baseCoins: 5, // Increased from 2 (metadata + 30 frames + audio)
      description: "Shorts/Reels (< 1 min) - Full Analysis"
    },
    {
      name: "Standard",
      maxDurationSeconds: 600, // 1-10 minutes
      baseCoins: 15, // Increased from 5 (metadata + 60 frames + audio + context)
      description: "Standard videos (1-10 min) - Full Analysis"
    },
    {
      name: "Long",
      maxDurationSeconds: 1800, // 10-30 minutes
      baseCoins: 30, // Increased from 10 (metadata + 90 frames + audio + context)
      description: "Long videos (10-30 min) - Full Analysis"
    },
    {
      name: "Deep Scan",
      maxDurationSeconds: 0, // > 30 minutes (unlimited)
      baseCoins: 50, // Increased from 20 (metadata + 60 frames + audio + context)
      description: "Very long videos (> 30 min) - Full Analysis"
    }
  ],
  
  engines: {
    gemini: {
      engineId: "gemini",
      pricePer1KTokens: 0.0001, // $0.0001 per 1K tokens
      avgTokensPerScan: 150000, // Updated: 150K tokens (360p frames + audio + metadata)
      lastUpdated: new Date().toISOString(),
      isAutoSync: false
    },
    groq: {
      engineId: "groq",
      pricePer1KTokens: 0.0002, // $0.0002 per 1K tokens
      avgTokensPerScan: 50000, // Text analysis only
      lastUpdated: new Date().toISOString(),
      isAutoSync: false
    }
  },
  
  adminMultiplier: 1.5 // 50% profit margin (GUARANTEED PROFIT)
};

// Storage key for pricing config
const PRICING_CONFIG_KEY = "tubeclear_pricing_config";

/**
 * Load pricing config from localStorage
 */
export const loadPricingConfig = (): PricingConfig => {
  try {
    const stored = localStorage.getItem(PRICING_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load pricing config:", error);
  }
  
  return DEFAULT_PRICING_CONFIG;
};

/**
 * Save pricing config to localStorage
 */
export const savePricingConfig = (config: PricingConfig): void => {
  try {
    config.lastUpdated = new Date().toISOString();
    localStorage.setItem(PRICING_CONFIG_KEY, JSON.stringify(config));
    console.log("✅ Pricing config saved:", config.version);
  } catch (error) {
    console.error("Failed to save pricing config:", error);
  }
};

/**
 * Calculate scan cost based on duration and current pricing
 * 
 * PRICING MODEL:
 * - User's own API key (BYOK) = FREE SCAN (no coins charged)
 * - Admin API key (system-provided) = Coins charged with 50% profit margin
 */
export const calculateScanCost = (durationSeconds: number, hasUserAPIKey: boolean = false): { 
  cost: number; 
  breakdown: string;
  profit: number;
  isFree: boolean;
} => {
  const config = loadPricingConfig();
  
  // Find matching tier
  const tier = config.tiers.find(t => {
    if (t.maxDurationSeconds === 0) return true; // Unlimited tier
    return durationSeconds <= t.maxDurationSeconds;
  });
  
  if (!tier) {
    console.warn("No pricing tier found, using default");
    return { cost: 0, breakdown: "Invalid scan", profit: 0, isFree: false };
  }
  
  // USER'S OWN API KEY = FREE SCAN (BYOK)
  if (hasUserAPIKey) {
    return {
      cost: 0,
      breakdown: `FREE: Using your own API key - ${tier.name} scan (${Math.ceil(durationSeconds / 60)} min)`,
      profit: 0,
      isFree: true
    };
  }
  
  // ADMIN API KEY = CHARGE COINS WITH 50% PROFIT
  const finalCost = Math.ceil(tier.baseCoins * config.adminMultiplier);
  const actualCost = tier.baseCoins;
  const profit = finalCost - actualCost;
  
  const breakdown = `${tier.name} scan (${Math.ceil(durationSeconds / 60)} min): ${tier.baseCoins} base × ${config.adminMultiplier} = ${finalCost} coins`;
  
  return {
    cost: finalCost,
    breakdown,
    profit,
    isFree: false
  };
};

/**
 * Update pricing tiers (Admin function)
 */
export const updatePricingTiers = (
  newTiers: PricingTier[],
  reason: string = "Manual admin update"
): PricingConfig => {
  const config = loadPricingConfig();
  
  // Save old prices for notification
  const oldTiers = [...config.tiers];
  
  // Update config
  config.version += 1;
  config.tiers = newTiers;
  config.lastPriceChange = {
    date: new Date().toISOString(),
    reason,
    oldPrices: oldTiers,
    newPrices: newTiers
  };
  
  savePricingConfig(config);
  
  console.log(`✅ Pricing updated to v${config.version}: ${reason}`);
  
  return config;
};

/**
 * Update admin multiplier (for profit margin)
 */
export const updateAdminMultiplier = (multiplier: number): PricingConfig => {
  const config = loadPricingConfig();
  config.adminMultiplier = Math.max(1.0, multiplier); // Minimum 1.0
  savePricingConfig(config);
  
  console.log(`✅ Admin multiplier updated: ${config.adminMultiplier}x`);
  
  return config;
};

/**
 * Auto-calculate prices based on AI engine costs
 * (Optional - can be triggered by admin)
 */
export const autoCalculatePrices = (): PricingConfig => {
  const config = loadPricingConfig();
  const oldTiers = [...config.tiers];
  
  // Calculate cost per scan for each engine
  const geminiCostPerScan = (config.engines.gemini.pricePer1KTokens / 1000) * config.engines.gemini.avgTokensPerScan;
  const groqCostPerScan = (config.engines.groq.pricePer1KTokens / 1000) * config.engines.groq.avgTokensPerScan;
  
  // Use higher cost for safety margin
  const maxCostPerScan = Math.max(geminiCostPerScan, groqCostPerScan);
  
  // Convert to coins
  const coinsPerScan = Math.ceil(maxCostPerScan / config.coinValueInUSD);
  
  // Update tiers proportionally
  config.tiers = [
    {
      name: "Short",
      maxDurationSeconds: 60,
      baseCoins: Math.max(2, Math.ceil(coinsPerScan * 0.4)),
      description: "Shorts/Reels (< 1 min)"
    },
    {
      name: "Standard",
      maxDurationSeconds: 600,
      baseCoins: Math.max(5, coinsPerScan),
      description: "Standard videos (1-10 min)"
    },
    {
      name: "Long",
      maxDurationSeconds: 1800,
      baseCoins: Math.max(10, Math.ceil(coinsPerScan * 2)),
      description: "Long videos (10-30 min)"
    },
    {
      name: "Deep Scan",
      maxDurationSeconds: 0,
      baseCoins: Math.max(20, Math.ceil(coinsPerScan * 4)),
      description: "Very long videos (> 30 min)"
    }
  ];
  
  config.version += 1;
  config.lastPriceChange = {
    date: new Date().toISOString(),
    reason: "Auto-calculated from AI engine prices",
    oldPrices: oldTiers,
    newPrices: config.tiers
  };
  
  savePricingConfig(config);
  
  console.log("✅ Prices auto-calculated from AI engine costs");
  
  return config;
};

/**
 * Get current pricing info for display
 */
export const getPricingInfo = () => {
  const config = loadPricingConfig();
  
  return {
    version: config.version,
    lastUpdated: config.lastUpdated,
    tiers: config.tiers,
    hasUserAPIKey: false, // Will be set by caller
    adminMultiplier: config.adminMultiplier
  };
};

/**
 * Reset to default pricing
 */
export const resetToDefaultPricing = (): PricingConfig => {
  savePricingConfig(DEFAULT_PRICING_CONFIG);
  console.log("✅ Pricing reset to defaults");
  return DEFAULT_PRICING_CONFIG;
};
