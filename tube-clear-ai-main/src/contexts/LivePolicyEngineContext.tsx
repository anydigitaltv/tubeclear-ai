import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getPlatformPolicies, type PlatformPolicy, checkContentAgainstPolicies } from "@/utils/livePolicyFetcher";
import { 
  loadPolicyVersions, 
  savePolicyVersions, 
  updatePolicyVersion,
  loadPolicyHistory,
  savePolicyHistory,
  needsPolicyUpdate,
  type PolicyVersionRecord 
} from "@/utils/policyVersionTracker";

interface LivePolicyEngineContextType {
  // Current active policies
  activePolicies: Record<string, PlatformPolicy[]>;
  
  // Policy loading state
  isLoading: boolean;
  lastSyncTime: Date | null;
  
  // Platform-specific functions
  getPoliciesForPlatform: (platformId: string) => PlatformPolicy[];
  checkContent: (content: string, platformId: string) => { violations: PlatformPolicy[]; score: number };
  
  // Real-time sync
  syncPolicies: (platformId: string) => Promise<void>;
  syncAllPlatforms: () => Promise<void>;
  
  // Policy version tracking
  getPolicyHistory: (platformId: string, policyId: string) => PolicyVersionRecord | null;
  
  // Statistics
  getPolicyStats: () => {
    totalPolicies: number;
    platformsSynced: number;
    lastUpdate: Date | null;
  };
}

const LivePolicyEngineContext = createContext<LivePolicyEngineContextType | undefined>(undefined);

export const LivePolicyEngineProvider = ({ children }: { children: ReactNode }) => {
  const [activePolicies, setActivePolicies] = useState<Record<string, PlatformPolicy[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load policies on mount
  useEffect(() => {
    loadAllPolicies();
  }, []);

  /**
   * Load all policies for all platforms
   */
  const loadAllPolicies = useCallback(() => {
    const platforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion'];
    const policies: Record<string, PlatformPolicy[]> = {};
    
    platforms.forEach(platform => {
      policies[platform] = getPlatformPolicies(platform);
    });
    
    setActivePolicies(policies);
    setLastSyncTime(new Date());
  }, []);

  /**
   * Get policies for specific platform
   */
  const getPoliciesForPlatform = useCallback((platformId: string): PlatformPolicy[] => {
    return activePolicies[platformId] || [];
  }, [activePolicies]);

  /**
   * Check content against platform-specific policies
   */
  const checkContent = useCallback((content: string, platformId: string) => {
    return checkContentAgainstPolicies(content, platformId);
  }, []);

  /**
   * Sync policies for specific platform (real-time update)
   * NO date limits - always fetches latest
   */
  const syncPolicies = useCallback(async (platformId: string) => {
    setIsLoading(true);
    
    try {
      console.log(`🔄 Syncing live policies for ${platformId}...`);
      
      // Fetch latest policies
      const latestPolicies = getPlatformPolicies(platformId);
      
      // Load existing versions
      let versions = loadPolicyVersions();
      const allHistory = loadPolicyHistory();
      let newHistory: any[] = [];
      
      // Update versions (keeps old + adds new)
      latestPolicies.forEach(policy => {
        const result = updatePolicyVersion(platformId, policy, versions);
        versions = result.versions;
        newHistory = [...newHistory, ...result.history];
      });
      
      // Save updated versions
      savePolicyVersions(versions);
      savePolicyHistory([...allHistory, ...newHistory]);
      
      // Update active policies
      setActivePolicies(prev => ({
        ...prev,
        [platformId]: latestPolicies,
      }));
      
      setLastSyncTime(new Date());
      
      console.log(`✅ Policies synced for ${platformId}: ${latestPolicies.length} policies`);
    } catch (error) {
      console.error(`Failed to sync policies for ${platformId}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sync all platforms
   */
  const syncAllPlatforms = useCallback(async () => {
    const platforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion'];
    
    setIsLoading(true);
    try {
      for (const platform of platforms) {
        await syncPolicies(platform);
      }
      console.log('✅ All platforms synced');
    } catch (error) {
      console.error('Failed to sync all platforms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [syncPolicies]);

  /**
   * Get policy history
   */
  const getPolicyHistory = useCallback((platformId: string, policyId: string) => {
    const versions = loadPolicyVersions();
    const key = `${platformId}_${policyId}`;
    return versions[key] || null;
  }, []);

  /**
   * Get policy statistics
   */
  const getPolicyStats = useCallback(() => {
    const platforms = Object.keys(activePolicies);
    const totalPolicies = platforms.reduce((sum, platform) => {
      return sum + (activePolicies[platform]?.length || 0);
    }, 0);
    
    return {
      totalPolicies,
      platformsSynced: platforms.length,
      lastUpdate: lastSyncTime,
    };
  }, [activePolicies, lastSyncTime]);

  // Auto-sync every 30 minutes (real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      syncAllPlatforms();
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(interval);
  }, [syncAllPlatforms]);

  return (
    <LivePolicyEngineContext.Provider
      value={{
        activePolicies,
        isLoading,
        lastSyncTime,
        getPoliciesForPlatform,
        checkContent,
        syncPolicies,
        syncAllPlatforms,
        getPolicyHistory,
        getPolicyStats,
      }}
    >
      {children}
    </LivePolicyEngineContext.Provider>
  );
};

export const useLivePolicyEngine = () => {
  const ctx = useContext(LivePolicyEngineContext);
  if (!ctx) throw new Error("useLivePolicyEngine must be used within LivePolicyEngineProvider");
  return ctx;
};
