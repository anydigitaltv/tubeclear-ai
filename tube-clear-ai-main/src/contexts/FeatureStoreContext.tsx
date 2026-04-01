import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useCoins } from "@/contexts/CoinContext";

export type FeatureId = "agency_mode" | "violation_pass" | "auto_scan" | "no_ads";

export interface Feature {
  id: FeatureId;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export interface PurchasedFeature {
  featureId: FeatureId;
  purchasedAt: string;
  expiresAt: string;
}

interface FeatureStoreContextType {
  features: Feature[];
  purchasedFeatures: PurchasedFeature[];
  isFeatureActive: (featureId: FeatureId) => boolean;
  purchaseFeature: (featureId: FeatureId) => Promise<boolean>;
  getRemainingDays: (featureId: FeatureId) => number;
}

const FEATURES: Feature[] = [
  {
    id: "agency_mode",
    name: "Agency Mode",
    description: "Connect unlimited channels and manage multiple accounts",
    price: 100,
    icon: "Crown",
  },
  {
    id: "violation_pass",
    name: "Violation Pass",
    description: "Get one-time protection against a content violation",
    price: 5,
    icon: "Shield",
  },
  {
    id: "auto_scan",
    name: "Auto-Scan",
    description: "Automatic daily scanning of all connected platforms",
    price: 50,
    icon: "Scan",
  },
  {
    id: "no_ads",
    name: "No-Ads",
    description: "Remove all advertisements from the app",
    price: 80,
    icon: "Ban",
  },
];

const FEATURE_STORAGE_KEY = "tubeclear_features";

const FeatureStoreContext = createContext<FeatureStoreContextType | undefined>(undefined);

export const FeatureStoreProvider = ({ children }: { children: ReactNode }) => {
  const { balance, spendCoins, canAfford } = useCoins();
  const [purchasedFeatures, setPurchasedFeatures] = useState<PurchasedFeature[]>([]);

  // Load purchased features from storage
  useEffect(() => {
    const stored = localStorage.getItem(FEATURE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PurchasedFeature[];
      // Filter out expired features
      const now = new Date();
      const active = parsed.filter(f => new Date(f.expiresAt) > now);
      setPurchasedFeatures(active);
      // Update storage with only active features
      localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(active));
    }
  }, []);

  const isFeatureActive = useCallback((featureId: FeatureId): boolean => {
    const feature = purchasedFeatures.find(f => f.featureId === featureId);
    if (!feature) return false;
    return new Date(feature.expiresAt) > new Date();
  }, [purchasedFeatures]);

  const getRemainingDays = useCallback((featureId: FeatureId): number => {
    const feature = purchasedFeatures.find(f => f.featureId === featureId);
    if (!feature) return 0;
    
    const now = new Date();
    const expiresAt = new Date(feature.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [purchasedFeatures]);

  const purchaseFeature = useCallback(async (featureId: FeatureId): Promise<boolean> => {
    const feature = FEATURES.find(f => f.id === featureId);
    if (!feature) return false;
    
    // Check if already active
    if (isFeatureActive(featureId)) return false;
    
    // Check if can afford
    if (!canAfford(feature.price)) return false;
    
    // Spend coins
    const success = await spendCoins(feature.price, "premium_feature", `Purchased ${feature.name}`);
    if (!success) return false;
    
    // Calculate expiry (30 days from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const newPurchase: PurchasedFeature = {
      featureId,
      purchasedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    
    setPurchasedFeatures(prev => {
      const updated = [...prev.filter(f => f.featureId !== featureId), newPurchase];
      localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    
    return true;
  }, [canAfford, spendCoins, isFeatureActive]);

  return (
    <FeatureStoreContext.Provider
      value={{
        features: FEATURES,
        purchasedFeatures,
        isFeatureActive,
        purchaseFeature,
        getRemainingDays,
      }}
    >
      {children}
    </FeatureStoreContext.Provider>
  );
};

export const useFeatureStore = () => {
  const ctx = useContext(FeatureStoreContext);
  if (!ctx) throw new Error("useFeatureStore must be used within FeatureStoreProvider");
  return ctx;
};
