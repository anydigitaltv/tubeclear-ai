import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";
import { useNotifications } from "@/contexts/NotificationContext";

// Market data interfaces
export interface ExchangeRate {
  currency: string;
  rate: number; // Rate relative to USD
  lastUpdated: string;
}

export interface MarketData {
  rates: Record<string, number>; // USD to other currencies
  lastFetched: string;
  nextFetch: string;
}

export interface CompetitorRate {
  service: string;
  avgPricePerScan: number;
  currency: string;
}

export interface PriceAdjustment {
  region: string;
  oldPrice: number;
  newPrice: number;
  reason: "exchange_rate" | "competitor" | "api_cost" | "holiday";
  timestamp: string;
}

export interface UserLocation {
  country: string;
  countryCode: string;
  currency: string;
  tier: "tier1" | "tier2" | "tier3";
  isHoliday: boolean;
  holidayName?: string;
}

interface GlobalMarketContextType {
  userLocation: UserLocation | null;
  exchangeRates: MarketData;
  competitorRates: CompetitorRate[];
  priceHistory: PriceAdjustment[];
  isLoading: boolean;
  detectUserLocation: () => Promise<void>;
  fetchExchangeRates: (force?: boolean) => Promise<void>;
  checkCompetitorRates: () => Promise<void>;
  adjustPricesForRegion: (basePrice: number) => number;
  calculateProfitMargin: (apiCost: number) => number;
  getCoinPackagePrice: (packageId: string) => number;
  isFlashSaleActive: () => boolean;
  getFlashSaleDiscount: () => number;
}

// Constants
const FETCH_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours
const EXCHANGE_RATE_THRESHOLD = 0.02; // 2% change triggers adjustment
const COMPETITOR_UNDERCUT = 0.10; // 10% cheaper than competitors
const ADMIN_PHONE = "+923154414981";

// Tier-based profit margins
const PROFIT_MARGINS: Record<string, number> = {
  tier1: 0.70, // 70% for USA/UK/Europe
  tier2: 0.40, // 40% for developing countries
  tier3: 0.30, // 30% for lowest income regions
};

// Country tier classification
const COUNTRY_TIERS: Record<string, "tier1" | "tier2" | "tier3"> = {
  // Tier 1 (High income)
  US: "tier1", GB: "tier1", DE: "tier1", FR: "tier1", IT: "tier1", ES: "tier1", 
  CA: "tier1", AU: "tier1", NZ: "tier1", JP: "tier1", KR: "tier1", SG: "tier1",
  AE: "tier1", SA: "tier1", QA: "tier1", KW: "tier1",
  
  // Tier 2 (Middle income)
  PK: "tier2", IN: "tier2", BD: "tier2", LK: "tier2", NP: "tier2",
  PH: "tier2", VN: "tier2", ID: "tier2", TH: "tier2", MY: "tier2",
  EG: "tier2", NG: "tier2", KE: "tier2", ZA: "tier2", BR: "tier2", MX: "tier2",
  
  // Tier 3 (Low income) - default
};

// Currency mapping
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", EU: "EUR", PK: "PKR", IN: "INR",
  SA: "SAR", AE: "AED", CA: "CAD", AU: "AUD", JP: "JPY",
};

// Holiday detection (simplified - would use proper holiday API in production)
const HOLIDAYS_latest: Record<string, string[]> = {
  PK: ["latest-03-23", "latest-08-14", "latest-12-25"],
  US: ["latest-01-01", "latest-07-04", "latest-11-26", "latest-12-25"],
  GB: ["latest-01-01", "latest-12-25", "latest-12-26"],
  IN: ["latest-01-26", "latest-08-15", "latest-10-02"],
};

const FLASH_SALE_DISCOUNT = 0.20; // 20% off

const GlobalMarketContext = createContext<GlobalMarketContextType | undefined>(undefined);

const MARKET_DATA_KEY = "tubeclear_market_data";
const LOCATION_KEY = "tubeclear_user_location";
const PRICE_HISTORY_KEY = "tubeclear_price_adjustments";

export const GlobalMarketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addCoins } = useCoins();
  const { addNotification, sendGlobalNotification } = useNotifications();

  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    try {
      const stored = localStorage.getItem(LOCATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [exchangeRates, setExchangeRates] = useState<MarketData>(() => {
    try {
      const stored = localStorage.getItem(MARKET_DATA_KEY);
      return stored ? JSON.parse(stored) : {
        rates: { PKR: 278.5, GBP: 0.79, EUR: 0.92, SAR: 3.75, AED: 3.67 },
        lastFetched: new Date().toISOString(),
        nextFetch: new Date(Date.now() + FETCH_INTERVAL_MS).toISOString(),
      };
    } catch {
      return {
        rates: { PKR: 278.5, GBP: 0.79, EUR: 0.92, SAR: 3.75, AED: 3.67 },
        lastFetched: new Date().toISOString(),
        nextFetch: new Date(Date.now() + FETCH_INTERVAL_MS).toISOString(),
      };
    }
  });

  const [competitorRates, setCompetitorRates] = useState<CompetitorRate[]>([
    { service: "OpenAI per scan", avgPricePerScan: 0.05, currency: "USD" },
    { service: "Gemini Pro", avgPricePerScan: 0.03, currency: "USD" },
    { service: "Claude API", avgPricePerScan: 0.04, currency: "USD" },
  ]);

  const [priceHistory, setPriceHistory] = useState<PriceAdjustment[]>(() => {
    try {
      const stored = localStorage.getItem(PRICE_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Detect user location via IP
  const detectUserLocation = useCallback(async () => {
    try {
      // Using ipapi.co for free IP geolocation (in production, use paid service)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      const countryCode = data.country_code || 'US';
      const country = data.country_name || 'United States';
      const currency = COUNTRY_CURRENCY[countryCode] || 'USD';
      const tier = COUNTRY_TIERS[countryCode] || 'tier3';
      
      // Check for holidays
      const today = new Date().toISOString().split('T')[0];
      const holidays = HOLIDAYS_latest[countryCode] || [];
      const isHoliday = holidays.includes(today);
      const holidayName = isHoliday ? "Local Holiday" : undefined;

      const location: UserLocation = {
        country,
        countryCode,
        currency,
        tier,
        isHoliday,
        holidayName,
      };

      setUserLocation(location);
      localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
      
      console.log('User location detected:', location);
    } catch (error) {
      console.error('Failed to detect location:', error);
      // Default to Pakistan
      const defaultLocation: UserLocation = {
        country: 'Pakistan',
        countryCode: 'PK',
        currency: 'PKR',
        tier: 'tier2',
        isHoliday: false,
      };
      setUserLocation(defaultLocation);
      localStorage.setItem(LOCATION_KEY, JSON.stringify(defaultLocation));
    }
  }, []);

  // Fetch real exchange rates every 48 hours
  const fetchExchangeRates = useCallback(async (force = false) => {
    const now = new Date();
    const shouldFetch = force || new Date(exchangeRates.nextFetch) <= now;
    
    if (!shouldFetch) {
      console.log('Exchange rates still valid until:', exchangeRates.nextFetch);
      return;
    }

    setIsLoading(true);
    try {
      // Using exchangerate-api.com (free tier)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      const oldRates = { ...exchangeRates.rates };
      const newRates = data.rates;
      
      // Check for significant changes (>2%)
      const adjustments: PriceAdjustment[] = [];
      
      for (const [currency, oldRate] of Object.entries(oldRates)) {
        const newRate = newRates[currency];
        if (newRate) {
          const changePercent = Math.abs((newRate - oldRate) / oldRate);
          
          if (changePercent > EXCHANGE_RATE_THRESHOLD) {
            adjustments.push({
              region: currency,
              oldPrice: oldRate,
              newPrice: newRate,
              reason: "exchange_rate",
              timestamp: new Date().toISOString(),
            });
            
            console.log(`Significant rate change for ${currency}: ${(changePercent * 100).toFixed(2)}%`);
          }
        }
      }
      
      // Save new rates
      const updatedMarketData: MarketData = {
        rates: newRates,
        lastFetched: now.toISOString(),
        nextFetch: new Date(now.getTime() + FETCH_INTERVAL_MS).toISOString(),
      };
      
      setExchangeRates(updatedMarketData);
      localStorage.setItem(MARKET_DATA_KEY, JSON.stringify(updatedMarketData));
      
      // Save price history
      if (adjustments.length > 0) {
        const updatedHistory = [...priceHistory, ...adjustments].slice(-100);
        setPriceHistory(updatedHistory);
        localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(updatedHistory));
        
        // Notify admin
        await sendAdminAlert(`Market Rate Updated: Exchange rates adjusted for ${adjustments.length} currencies. Details logged.`);
      }
      
      console.log('Exchange rates updated successfully');
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [exchangeRates, priceHistory]);

  // Check competitor rates (simulated - would use web scraping in production)
  const checkCompetitorRates = useCallback(async () => {
    try {
      // Simulate fetching competitor data
      // In production: scrape pricing pages or use API
      const simulatedRates: CompetitorRate[] = [
        { service: "OpenAI per scan", avgPricePerScan: 0.045, currency: "USD" },
        { service: "Gemini Pro", avgPricePerScan: 0.028, currency: "USD" },
        { service: "Claude API", avgPricePerScan: 0.038, currency: "USD" },
      ];
      
      const avgMarketPrice = simulatedRates.reduce((sum, r) => sum + r.avgPricePerScan, 0) / simulatedRates.length;
      const ourTargetPrice = avgMarketPrice * (1 - COMPETITOR_UNDERCUT); // 10% cheaper
      
      console.log(`Market average: $${avgMarketPrice.toFixed(4)}, Our target: $${ourTargetPrice.toFixed(4)}`);
      
      setCompetitorRates(simulatedRates);
    } catch (error) {
      console.error('Failed to check competitor rates:', error);
    }
  }, []);

  // Adjust prices based on region and tier
  const adjustPricesForRegion = useCallback((basePrice: number): number => {
    if (!userLocation) return basePrice;
    
    const margin = PROFIT_MARGINS[userLocation.tier];
    const adjustedPrice = basePrice * (1 + margin);
    
    // Apply flash sale discount if active
    const discount = getFlashSaleDiscount();
    if (discount > 0) {
      return adjustedPrice * (1 - discount);
    }
    
    return adjustedPrice;
  }, [userLocation]);

  // Calculate profit margin for API cost
  const calculateProfitMargin = useCallback((apiCost: number): number => {
    if (!userLocation) return apiCost * 2; // Default 100% markup
    
    const margin = PROFIT_MARGINS[userLocation.tier];
    return apiCost * (1 + margin);
  }, [userLocation]);

  // Get coin package price based on region
  const getCoinPackagePrice = useCallback((packageId: string): number => {
    const basePackages: Record<string, number> = {
      "starter": 100,   // 100 coins base price
      "standard": 500,  // 600 coins
      "premium": 1000,  // 1500 coins
    };
    
    const basePrice = basePackages[packageId] || 100;
    return adjustPricesForRegion(basePrice);
  }, [adjustPricesForRegion]);

  // Check if flash sale is active (during holidays)
  const isFlashSaleActive = useCallback((): boolean => {
    if (!userLocation) return false;
    return userLocation.isHoliday;
  }, [userLocation]);

  // Get flash sale discount percentage
  const getFlashSaleDiscount = useCallback((): number => {
    return isFlashSaleActive() ? FLASH_SALE_DISCOUNT : 0;
  }, [isFlashSaleActive]);

  // Send admin alert
  const sendAdminAlert = useCallback(async (message: string) => {
    console.log(`[ADMIN ALERT] To: ${ADMIN_PHONE}`);
    console.log(`[ADMIN ALERT] Message: ${message}`);
    
    // In production, call SMS API
    // await fetch(SMS_API_URL, {
    //   method: 'POST',
    //   body: JSON.stringify({ to: ADMIN_PHONE, message }),
    // });
    
    addNotification({
      type: "info",
      title: "Admin Alert Sent",
      message,
    });
  }, [addNotification]);

  // Auto-fetch exchange rates on mount and every 48h
  useEffect(() => {
    detectUserLocation();
    fetchExchangeRates();
    checkCompetitorRates();
    
    const interval = setInterval(() => {
      fetchExchangeRates();
      checkCompetitorRates();
    }, FETCH_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [detectUserLocation, fetchExchangeRates, checkCompetitorRates]);

  return (
    <GlobalMarketContext.Provider
      value={{
        userLocation,
        exchangeRates,
        competitorRates,
        priceHistory,
        isLoading,
        detectUserLocation,
        fetchExchangeRates,
        checkCompetitorRates,
        adjustPricesForRegion,
        calculateProfitMargin,
        getCoinPackagePrice,
        isFlashSaleActive,
        getFlashSaleDiscount,
      }}
    >
      {children}
    </GlobalMarketContext.Provider>
  );
};

export const useGlobalMarket = () => {
  const ctx = useContext(GlobalMarketContext);
  if (!ctx) throw new Error("useGlobalMarket must be used within GlobalMarketProvider");
  return ctx;
};
