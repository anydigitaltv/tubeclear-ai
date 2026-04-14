/**
 * Policy Version Tracker - Tracks old and new policies with NO date limits
 * Maintains complete policy history
 */

import type { PlatformPolicy, PolicyHistoryEntry } from "./livePolicyFetcher";

export interface PolicyVersionRecord {
  platformId: string;
  policyId: string;
  versions: {
    version: string;
    effectiveDate: string;
    deprecatedDate?: string;
    isActive: boolean;
    policy: PlatformPolicy;
  }[];
  currentVersion: string;
  totalVersions: number;
  lastChecked: string;
}

const POLICY_VERSION_STORAGE = "tubeclear_policy_versions";
const POLICY_HISTORY_STORAGE = "tubeclear_policy_history";

/**
 * Load all policy versions from localStorage
 */
export const loadPolicyVersions = (): Record<string, PolicyVersionRecord> => {
  try {
    const stored = localStorage.getItem(POLICY_VERSION_STORAGE);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Save policy versions to localStorage
 */
export const savePolicyVersions = (versions: Record<string, PolicyVersionRecord>) => {
  try {
    localStorage.setItem(POLICY_VERSION_STORAGE, JSON.stringify(versions));
  } catch (error) {
    console.error("Failed to save policy versions:", error);
  }
};

/**
 * Load policy history from localStorage
 */
export const loadPolicyHistory = (): PolicyHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(POLICY_HISTORY_STORAGE);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save policy history to localStorage
 */
export const savePolicyHistory = (history: PolicyHistoryEntry[]) => {
  try {
    // Keep only last 100 entries to prevent storage overflow
    const trimmed = history.slice(-100);
    localStorage.setItem(POLICY_HISTORY_STORAGE, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save policy history:", error);
  }
};

/**
 * Update policy version when changes detected
 * Keeps OLD policies for reference, adds NEW policies
 */
export const updatePolicyVersion = (
  platformId: string,
  newPolicy: PlatformPolicy,
  versions: Record<string, PolicyVersionRecord>
): { versions: Record<string, PolicyVersionRecord>; history: PolicyHistoryEntry[] } => {
  const key = `${platformId}_${newPolicy.id}`;
  const existing = versions[key];
  const history: PolicyHistoryEntry[] = [];
  
  if (!existing) {
    // New policy - add first version
    versions[key] = {
      platformId,
      policyId: newPolicy.id,
      versions: [{
        version: 'latest',
        effectiveDate: new Date().toISOString(),
        isActive: true,
        policy: newPolicy,
      }],
      currentVersion: 'latest',
      totalVersions: 1,
      lastChecked: new Date().toISOString(),
    };
    
    history.push({
      policyId: newPolicy.id,
      previousVersion: 'none',
      currentVersion: 'latest',
      changedAt: new Date().toISOString(),
      changeType: 'new',
      changes: ['Policy added'],
    });
  } else {
    // Check if policy has changed
    const currentPolicy = existing.versions.find(v => v.isActive)?.policy;
    
    if (currentPolicy) {
      const hasChanges = JSON.stringify(currentPolicy.keywords) !== JSON.stringify(newPolicy.keywords) ||
                        currentPolicy.title !== newPolicy.title ||
                        currentPolicy.description !== newPolicy.description;
      
      if (hasChanges) {
        // Deactivate old version (KEEP IT for history)
        existing.versions = existing.versions.map(v => ({
          ...v,
          isActive: false,
          deprecatedDate: v.isActive ? new Date().toISOString() : v.deprecatedDate,
        }));
        
        // Add new version
        existing.versions.push({
          version: 'latest',
          effectiveDate: new Date().toISOString(),
          isActive: true,
          policy: newPolicy,
        });
        
        existing.currentVersion = 'latest';
        existing.totalVersions = existing.versions.length;
        existing.lastChecked = new Date().toISOString();
        
        history.push({
          policyId: newPolicy.id,
          previousVersion: 'previous',
          currentVersion: 'latest',
          changedAt: new Date().toISOString(),
          changeType: 'updated',
          changes: [
            'Keywords updated',
            'Description modified',
            'Policy refreshed',
          ],
        });
      } else {
        // No changes - just update lastChecked
        existing.lastChecked = new Date().toISOString();
      }
    }
  }
  
  return { versions, history };
};

/**
 * Get all versions of a specific policy (old + new)
 */
export const getPolicyVersionHistory = (
  platformId: string,
  policyId: string,
  versions: Record<string, PolicyVersionRecord>
): PolicyVersionRecord | null => {
  const key = `${platformId}_${policyId}`;
  return versions[key] || null;
};

/**
 * Get active policy (latest version)
 */
export const getActivePolicy = (
  platformId: string,
  policyId: string,
  versions: Record<string, PolicyVersionRecord>
): PlatformPolicy | null => {
  const key = `${platformId}_${policyId}`;
  const record = versions[key];
  
  if (!record) return null;
  
  const activeVersion = record.versions.find(v => v.isActive);
  return activeVersion?.policy || null;
};

/**
 * Get all active policies for a platform
 */
export const getActivePoliciesForPlatform = (
  platformId: string,
  versions: Record<string, PolicyVersionRecord>
): PlatformPolicy[] => {
  const policies: PlatformPolicy[] = [];
  
  Object.entries(versions).forEach(([key, record]) => {
    if (record.platformId === platformId) {
      const activeVersion = record.versions.find(v => v.isActive);
      if (activeVersion) {
        policies.push(activeVersion.policy);
      }
    }
  });
  
  return policies;
};

/**
 * Check if policy needs update (last checked > 1 hour ago)
 */
export const needsPolicyUpdate = (
  platformId: string,
  policyId: string,
  versions: Record<string, PolicyVersionRecord>
): boolean => {
  const key = `${platformId}_${policyId}`;
  const record = versions[key];
  
  if (!record) return true;
  
  const lastChecked = new Date(record.lastChecked).getTime();
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  return lastChecked < oneHourAgo;
};

/**
 * Get policy change statistics
 */
export const getPolicyChangeStats = (
  history: PolicyHistoryEntry[],
  platformId?: string
): {
  totalChanges: number;
  newPolicies: number;
  updatedPolicies: number;
  deprecatedPolicies: number;
  recentChanges: PolicyHistoryEntry[];
} => {
  const filtered = platformId 
    ? history.filter(h => {
        const record = loadPolicyVersions();
        const key = Object.keys(record).find(k => k.includes(h.policyId));
        return key?.startsWith(platformId);
      })
    : history;
  
  const recentChanges = filtered.slice(-10); // Last 10 changes
  
  return {
    totalChanges: filtered.length,
    newPolicies: filtered.filter(h => h.changeType === 'new').length,
    updatedPolicies: filtered.filter(h => h.changeType === 'updated').length,
    deprecatedPolicies: filtered.filter(h => h.changeType === 'deprecated').length,
    recentChanges,
  };
};

/**
 * Export policy history as JSON (for backup/audit)
 */
export const exportPolicyHistory = (): {
  versions: Record<string, PolicyVersionRecord>;
  history: PolicyHistoryEntry[];
  exportedAt: string;
} => {
  return {
    versions: loadPolicyVersions(),
    history: loadPolicyHistory(),
    exportedAt: new Date().toISOString(),
  };
};

/**
 * Import policy history from JSON
 */
export const importPolicyHistory = (data: {
  versions: Record<string, PolicyVersionRecord>;
  history: PolicyHistoryEntry[];
}) => {
  savePolicyVersions(data.versions);
  savePolicyHistory(data.history);
};

/**
 * Clear all policy versions (reset)
 */
export const clearPolicyVersions = () => {
  localStorage.removeItem(POLICY_VERSION_STORAGE);
  localStorage.removeItem(POLICY_HISTORY_STORAGE);
};
