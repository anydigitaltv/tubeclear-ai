/**
 * Dynamic Pricing Configuration System
 * 
 * UPDATED: Now uses REAL-TIME cost calculation based on:
 * - Live AI engine prices (Gemini, Groq)
 * - Video duration (length-based)
 * - 360p quality optimization
 * - Actual token usage
 * 
 * NO FIXED PRICES - Everything calculated dynamically!
 */

import { calculateRealTimeScanCost, type ScanCostBreakdown } from '@/utils/realTimeCostCalculator';

export interface PricingTier {
  name: string;
  maxDurationSeconds: number; // 0 = unlimited (for max tier)
  baseCoins: number; // DEPRECATED - Now calculated dynamically
  description: string;
}

export interface AIEnginePricing {
  engineId: string;
  pricePer1KTokens: number; // USD (LIVE PRICE)
  avgTokensPerScan: number;
  lastUpdated: string;
  isAutoSync: boolean;
}

export interface PricingConfig {
  version: number;
  lastUpdated: string;
  currency: string;
  coinValueInUSD: number; // 1 coin = $X USD
  
  // Pricing tiers (DEPRECATED - for backward compatibility only)
  tiers: PricingTier[];
  
  // AI engine pricing (LIVE PRICES)
  engines: {
    gemini: AIEnginePricing;
    groq: AIEnginePricing;
  };
  
  // Admin profit margin (30%)
  adminProfitMargin: number;
  
  // Video quality for analysis
  defaultQuality: '360p' | '720p' | '1080p';
  
  // Price change notification
  lastPriceChange?: {
    date: string;
    reason: string;
    oldPrices: PricingTier[];
    newPrices: PricingTier[];
  };
}

// Default pricing configuration - UPDATED FOR REAL-TIME CALCULATION
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: 3, // Updated to v3 for real-time pricing
  lastUpdated: new Date().toISOString(),
  currency: "USD",
  coinValueInUSD: 0.001, // 1 coin = $0.001 (1000 coins = $1)
  
  // DEPRECATED: Kept for backward compatibility only
  tiers: [
    {
      name: "Short",
      maxDurationSeconds: 60,
      baseCoins: 0, // Now calculated dynamically
      description: "Shorts/Reels (< 1 min) - Real-time pricing"
    },
    {
      name: "Standard",
      maxDurationSeconds: 600,
      baseCoins: 0, // Now calculated dynamically
      description: "Standard videos (1-10 min) - Real-time pricing"
    },
    {
      name: "Long",
      maxDurationSeconds: 1800,
      baseCoins: 0, // Now calculated dynamically
      description: "Long videos (10-30 min) - Real-time pricing"
    },
    {
      name: "Deep Scan",
      maxDurationSeconds: 0,
      baseCoins: 0, // Now calculated dynamically
      description: "Very long videos (> 30 min) - Real-time pricing"
    }
  ],
  
  engines: {
    gemini: {
      engineId: "gemini",
      pricePer1KTokens: 0.0001, // $0.0001 per 1K tokens (Gemini 1.5 Flash)
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
  
  adminProfitMargin: 0.30, // 30% profit margin
  defaultQuality: '360p' // 360p = 90% token savings
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
 * Calculate scan cost using REAL-TIME dynamic pricing
 * 
 * @param durationSeconds - Video duration in seconds
 * @param hasUserAPIKey - Whether user has own API key (FREE if true)
 * @param engineId - AI engine to use (default: gemini)
 * @param videoQuality - Video quality (default: 360p)
 * @returns Complete cost breakdown with transparency
 */
export const calculateScanCost = (
  durationSeconds: number,
  hasUserAPIKey: boolean = false,
  engineId: string = 'gemini',
  videoQuality: '360p' | '720p' | '1080p' = '360p'
): ScanCostBreakdown & { isFree: boolean } => {
  // User's own API key = FREE SCAN
  if (hasUserAPIKey) {
    const freeBreakdown = calculateRealTimeScanCost(0, engineId, videoQuality);
    return {
      ...freeBreakdown,
      userCostCoins: 0,
      adminCostCoins: 0,
      adminProfitCoins: 0,
      profitMarginPercent: 0,
      totalCostUSD: 0,
      isFree: true,
      breakdown: 'FREE: Using your own API key - No coins deducted'
    };
  }
  
  // Calculate real-time cost
  const costBreakdown = calculateRealTimeScanCost(durationSeconds, engineId, videoQuality);
  
  return {
    ...costBreakdown,
    isFree: false
  };
};

/**
 * Update AI engine price (called when provider changes prices)
 */
export const updateEnginePrice = (
  engineId: string,
  newPricePer1KTokens: number
): PricingConfig => {
  const config = loadPricingConfig();
  
  if (config.engines[engineId as keyof typeof config.engines]) {
    config.engines[engineId as keyof typeof config.engines].pricePer1KTokens = newPricePer1KTokens;
    config.engines[engineId as keyof typeof config.engines].lastUpdated = new Date().toISOString();
    
    savePricingConfig(config);
    
    console.log(`✅ Updated ${engineId} price: $${newPricePer1KTokens} per 1K tokens`);
  }
  
  return config;
};

/**
 * Update admin profit margin
 */
export const updateAdminProfitMargin = (margin: number): PricingConfig => {
  const config = loadPricingConfig();
  config.adminProfitMargin = Math.max(0, Math.min(1, margin)); // 0-100%
  savePricingConfig(config);
  
  console.log(`✅ Admin profit margin updated: ${(config.adminProfitMargin * 100).toFixed(0)}%`);
  
  return config;
};

/**
 * Update default video quality
 */
export const updateDefaultQuality = (quality: '360p' | '720p' | '1080p'): PricingConfig => {
  const config = loadPricingConfig();
  config.defaultQuality = quality;
  savePricingConfig(config);
  
  console.log(`✅ Default quality updated: ${quality}`);
  
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
    coinValueUSD: config.coinValueInUSD,
    adminProfitMargin: config.adminProfitMargin,
    defaultQuality: config.defaultQuality,
    enginePrices: {
      gemini: config.engines.gemini.pricePer1KTokens,
      groq: config.engines.groq.pricePer1KTokens
    }
  };
};

/**
 * Reset to default pricing
 */
export const resetToDefaultPricing = (): PricingConfig => {
  savePricingConfig(DEFAULT_PRICING_CONFIG);
  console.log("✅ Pricing reset to defaults (real-time calculation)");
  return DEFAULT_PRICING_CONFIG;
};
