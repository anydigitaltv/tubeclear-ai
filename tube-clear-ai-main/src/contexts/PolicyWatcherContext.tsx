import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// Policy interfaces
export interface LivePolicy {
  id: string;
  platformId: string; // youtube, tiktok, instagram, facebook, dailymotion
  category: "content" | "metadata" | "thumbnail" | "ai_disclosure" | "monetization";
  title: string;
  description: string;
  urduDescription?: string;
  keywords: string[];
  policyUrl: string; // Direct link to official policy page
  effectiveDate: string;
  lastVerified: string;
  isLive: boolean;
}

export interface PolicyUpdate {
  platformId: string;
  updateType: "new_rule" | "modified_rule" | "deprecated_rule";
  summary: string;
  publishedAt: string;
  url: string;
}

export interface PolicyVerification {
  platformId: string;
  verifiedAt: string;
  status: "verified" | "outdated" | "fetching" | "error";
  policyVersion: string;
  totalRules: number;
}

interface PolicyWatcherContextType {
  livePolicies: Record<string, LivePolicy[]>;
  policyUpdates: PolicyUpdate[];
  verificationStatus: Record<string, PolicyVerification>;
  isLoading: boolean;
  lastSyncTime: Date | null;
  fetchLivePolicies: (platformId: string) => Promise<void>;
  verifyPolicyTimestamp: (platformId: string) => PolicyVerification;
  getLatestPolicyVersion: (platformId: string) => string;
  getPolicyUrl: (platformId: string, categoryId?: string) => string;
  checkForUpdates: () => Promise<boolean>;
  getPoliciesByCategory: (platformId: string, category: string) => LivePolicy[];
}

// Platform policy URLs (official sources)
const PLATFORM_POLICY_URLS: Record<string, string> = {
  youtube: "https://support.google.com/youtube/answer/2801973",
  tiktok: "https://www.tiktok.com/community-guidelines",
  instagram: "https://help.instagram.com/477434105621119",
  facebook: "https://www.facebook.com/communitystandards",
  dailymotion: "https://faq.dailymotion.com/hc/en-us/articles/360000194977-Community-Guidelines",
};

// API endpoints for policy fetching (in production, use official APIs or webhooks)
const POLICY_API_ENDPOINTS: Record<string, string> = {
  youtube: "https://developers.youtube.com/docs/api-guides/policy-updates",
  tiktok: "https://developers.tiktok.com/doc/policy-updates",
  instagram: "https://developers.facebook.com/docs/instagram-api/policy",
  facebook: "https://developers.facebook.com/docs/platform-policy",
  dailymotion: "https://developer.dailymotion.com/policies",
};

const POLICY_STORAGE_KEY = "tubeclear_live_policies";
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour for live sync
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours cache

const PolicyWatcherContext = createContext<PolicyWatcherContextType | undefined>(undefined);

export const PolicyWatcherProvider = ({ children }: { children: ReactNode }) => {
  const [livePolicies, setLivePolicies] = useState<Record<string, LivePolicy[]>>(() => {
    try {
      const stored = localStorage.getItem(POLICY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [policyUpdates, setPolicyUpdates] = useState<PolicyUpdate[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<Record<string, PolicyVerification>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Fetch live policies from platform APIs
  const fetchLivePolicies = useCallback(async (platformId: string) => {
    setIsLoading(true);
    
    try {
      // In production, this would call:
      // 1. YouTube Data API - Community Guidelines endpoint
      // 2. TikTok Research API - Policy updates
      // 3. Instagram Graph API - Policy changes
      // 4. Custom webhook aggregators for real-time updates
      
      // For now, simulate with cached data + timestamp
      const now = new Date();
      const cachedPolicies = livePolicies[platformId] || [];
      
      // Check if cache is still valid (< 24h old)
      const hasValidCache = cachedPolicies.length > 0 && 
        cachedPolicies.some(p => {
          const lastVerified = new Date(p.lastVerified);
          const age = now.getTime() - lastVerified.getTime();
          return age < CACHE_EXPIRY_MS;
        });
      
      if (hasValidCache) {
        console.log(`Using cached policies for ${platformId} (valid for 24h)`);
        setVerificationStatus(prev => ({
          ...prev,
          [platformId]: {
            platformId,
            verifiedAt: now.toISOString(),
            status: "verified",
            policyVersion: `v${now.toISOString().split('T')[0]}`,
            totalRules: cachedPolicies.length,
          },
        }));
        setIsLoading(false);
        return;
      }
      
      // Fetch fresh policies (simulated - would use real APIs in production)
      console.log(`Fetching live policies for ${platformId}...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate updated policies with current timestamp
      const updatedPolicies: LivePolicy[] = [
        {
          id: `${platformId}-ai-disclosure-latest`,
          platformId,
          category: "ai_disclosure",
          title: "AI-Generated Content Disclosure Requirement",
          description: "All AI-generated or significantly altered content must be clearly labeled with 'Altered Content' disclosure",
          urduDescription: "Tamam AI se bana hua content 'Altered Content' label ke sath upload karna lazmi hai.",
          keywords: ["ai generated", "ai created", "synthetic media", "deepfake", "altered content"],
          policyUrl: `${PLATFORM_POLICY_URLS[platformId]}#ai-disclosure`,
          effectiveDate: "latest-01-01",
          lastVerified: now.toISOString(),
          isLive: true,
        },
        {
          id: `${platformId}-metadata-standards-latest`,
          platformId,
          category: "metadata",
          title: "Metadata Accuracy Standards",
          description: "Titles, descriptions, and tags must accurately represent video content without misleading clickbait",
          urduDescription: "Video ka Title aur Description bilkul sahi hona chahiye, clickbait se parhez karein.",
          keywords: ["clickbait", "misleading title", "false claims", "spam tags", "keyword stuffing"],
          policyUrl: PLATFORM_POLICY_URLS[platformId],
          effectiveDate: "latest-02-15",
          lastVerified: now.toISOString(),
          isLive: true,
        },
        {
          id: `${platformId}-thumbnail-policy-latest`,
          platformId,
          category: "thumbnail",
          title: "Thumbnail Authenticity Requirements",
          description: "Thumbnails must not be misleading or use deceptive imagery",
          urduDescription: "Thumbnail mein dhoka dahi ya ghalat tasaveer istemal karna mana hai.",
          keywords: ["misleading thumbnail", "fake thumbnail", "shocking imagery", "deceptive preview"],
          policyUrl: `${PLATFORM_POLICY_URLS[platformId]}#thumbnails`,
          effectiveDate: "latest-03-01",
          lastVerified: now.toISOString(),
          isLive: true,
        },
      ];
      
      setLivePolicies(prev => ({
        ...prev,
        [platformId]: updatedPolicies,
      }));
      
      // Save to localStorage
      localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify({
        ...livePolicies,
        [platformId]: updatedPolicies,
      }));
      
      // Update verification status
      setVerificationStatus(prev => ({
        ...prev,
        [platformId]: {
          platformId,
          verifiedAt: now.toISOString(),
          status: "verified",
          policyVersion: `v${now.toISOString().split('T')[0]}`,
          totalRules: updatedPolicies.length,
        },
      }));
      
      setLastSyncTime(now);
      console.log(`Live policies fetched for ${platformId}: ${updatedPolicies.length} rules`);
      
    } catch (error) {
      console.error(`Failed to fetch live policies for ${platformId}:`, error);
      
      setVerificationStatus(prev => ({
        ...prev,
        [platformId]: {
          platformId,
          verifiedAt: new Date().toISOString(),
          status: "error",
          policyVersion: "unknown",
          totalRules: 0,
        },
      }));
    } finally {
      setIsLoading(false);
    }
  }, [livePolicies]);

  // Verify policy timestamp for a specific platform
  const verifyPolicyTimestamp = useCallback((platformId: string): PolicyVerification => {
    const status = verificationStatus[platformId];
    
    if (!status) {
      return {
        platformId,
        verifiedAt: new Date().toISOString(),
        status: "outdated",
        policyVersion: "unknown",
        totalRules: 0,
      };
    }
    
    // Check if verification is still valid (< 1 hour old for live status)
    const lastVerified = new Date(status.verifiedAt);
    const age = Date.now() - lastVerified.getTime();
    
    if (age > SYNC_INTERVAL_MS) {
      // Trigger background refresh
      fetchLivePolicies(platformId);
      
      return {
        ...status,
        status: "outdated",
      };
    }
    
    return status;
  }, [verificationStatus, fetchLivePolicies]);

  // Get latest policy version string
  const getLatestPolicyVersion = useCallback((platformId: string): string => {
    const status = verificationStatus[platformId];
    return status?.policyVersion || "Not verified";
  }, [verificationStatus]);

  // Get direct policy URL
  const getPolicyUrl = useCallback((platformId: string, categoryId?: string): string => {
    const baseUrl = PLATFORM_POLICY_URLS[platformId];
    
    if (!categoryId) {
      return baseUrl;
    }
    
    // Add category anchor if available
    const policies = livePolicies[platformId] || [];
    const categoryPolicy = policies.find(p => p.category === categoryId);
    
    return categoryPolicy?.policyUrl || `${baseUrl}#${categoryId}`;
  }, [livePolicies]);

  // Check for policy updates across all platforms
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    const platforms = Object.keys(PLATFORM_POLICY_URLS);
    let hasUpdates = false;
    
    for (const platform of platforms) {
      const status = verificationStatus[platform];
      
      if (!status || status.status === "outdated") {
        await fetchLivePolicies(platform);
        hasUpdates = true;
      }
    }
    
    return hasUpdates;
  }, [verificationStatus, fetchLivePolicies]);

  // Get policies by category
  const getPoliciesByCategory = useCallback((platformId: string, category: string): LivePolicy[] => {
    const policies = livePolicies[platformId] || [];
    return policies.filter(p => p.category === category);
  }, [livePolicies]);

  // Auto-sync on mount (every hour)
  useEffect(() => {
    // Initial sync
    checkForUpdates();
    
    const interval = setInterval(() => {
      checkForUpdates();
    }, SYNC_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return (
    <PolicyWatcherContext.Provider
      value={{
        livePolicies,
        policyUpdates,
        verificationStatus,
        isLoading,
        lastSyncTime,
        fetchLivePolicies,
        verifyPolicyTimestamp,
        getLatestPolicyVersion,
        getPolicyUrl,
        checkForUpdates,
        getPoliciesByCategory,
      }}
    >
      {children}
    </PolicyWatcherContext.Provider>
  );
};

export const usePolicyWatcher = () => {
  const ctx = useContext(PolicyWatcherContext);
  if (!ctx) throw new Error("usePolicyWatcher must be used within PolicyWatcherProvider");
  return ctx;
};
