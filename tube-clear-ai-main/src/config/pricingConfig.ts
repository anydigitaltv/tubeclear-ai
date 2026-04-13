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

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  currency: "USD",
  coinValueInUSD: 0.001, // 1 coin = $0.001 (1000 coins = $1)
  
  tiers: [
    {
      name: "Short",
      maxDurationSeconds: 60, // < 1 minute
      baseCoins: 2,
      description: "Shorts/Reels (< 1 min)"
    },
    {
      name: "Standard",
      maxDurationSeconds: 600, // 1-10 minutes
      baseCoins: 5,
      description: "Standard videos (1-10 min)"
    },
    {
      name: "Long",
      maxDurationSeconds: 1800, // 10-30 minutes
      baseCoins: 10,
      description: "Long videos (10-30 min)"
    },
    {
      name: "Deep Scan",
      maxDurationSeconds: 0, // > 30 minutes (unlimited)
      baseCoins: 20,
      description: "Very long videos (> 30 min)"
    }
  ],
  
  engines: {
    gemini: {
      engineId: "gemini",
      pricePer1KTokens: 0.0001, // $0.0001 per 1K tokens
      avgTokensPerScan: 5000, // Average 5K tokens per scan
      lastUpdated: new Date().toISOString(),
      isAutoSync: false
    },
    groq: {
      engineId: "groq",
      pricePer1KTokens: 0.0002, // $0.0002 per 1K tokens
      avgTokensPerScan: 5000,
      lastUpdated: new Date().toISOString(),
      isAutoSync: false
    }
  },
  
  adminMultiplier: 1.0 // No markup by default
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
 */
export const calculateScanCost = (durationSeconds: number): number => {
  const config = loadPricingConfig();
  
  // Find matching tier
  const tier = config.tiers.find(t => {
    if (t.maxDurationSeconds === 0) return true; // Unlimited tier
    return durationSeconds <= t.maxDurationSeconds;
  });
  
  if (!tier) {
    console.warn("No pricing tier found, using default");
    return 5; // Default to standard pricing
  }
  
  // Apply admin multiplier
  const finalCost = Math.ceil(tier.baseCoins * config.adminMultiplier);
  
  return finalCost;
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
