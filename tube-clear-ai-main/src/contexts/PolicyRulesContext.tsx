import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PolicyRule {
  id: string;
  platformId: string;
  category: "content" | "monetization" | "community" | "copyright" | "thumbnail" | "metadata";
  rule: string;
  keywords: string[];
  severity: "low" | "medium" | "high" | "critical";
  effectiveDate: string;
  description: string;
}

export interface PolicyVersion {
  version: string;
  updatedAt: string;
  changes: string[];
}

interface PolicyRulesContextType {
  rules: PolicyRule[];
  policyVersions: Record<string, PolicyVersion>;
  addRule: (rule: Omit<PolicyRule, "id">) => void;
  updateRule: (id: string, rule: Partial<PolicyRule>) => void;
  deleteRule: (id: string) => void;
  getRulesByPlatform: (platformId: string) => PolicyRule[];
  checkViolation: (text: string, platformId: string, category?: PolicyRule["category"]) => PolicyRule[];
  refreshPolicies: () => Promise<void>;
  lastPolicyUpdate: string | null;
}

// Default policy rules (would be fetched from backend in production)
const DEFAULT_RULES: PolicyRule[] = [
  // YouTube Content Policies
  {
    id: "yt-content-1",
    platformId: "youtube",
    category: "content",
    rule: "No misleading or deceptive content",
    keywords: ["misleading", "deceptive", "fake", "scam", "clickbait"],
    severity: "high",
    effectiveDate: "2026-01-15",
    description: "Content that misleads users about product efficacy or makes false claims"
  },
  {
    id: "yt-content-2",
    platformId: "youtube",
    category: "monetization",
    rule: "No harmful or dangerous acts",
    keywords: ["dangerous", "harmful", "challenge", "prank", "stunt"],
    severity: "critical",
    effectiveDate: "2026-02-01",
    description: "Content showing dangerous activities that could cause injury"
  },
  {
    id: "yt-content-3",
    platformId: "youtube",
    category: "thumbnail",
    rule: "No misleading thumbnails",
    keywords: ["misleading thumbnail", "fake thumbnail", "clickbait thumbnail"],
    severity: "high",
    effectiveDate: "2026-02-15",
    description: "Thumbnails that don't represent actual video content"
  },
  {
    id: "yt-content-4",
    platformId: "youtube",
    category: "metadata",
    rule: "No excessive tag stuffing",
    keywords: ["tag stuffing", "keyword stuffing", "spam tags"],
    severity: "medium",
    effectiveDate: "2026-03-01",
    description: "Using excessive or irrelevant tags to manipulate search"
  },
  // TikTok Policies
  {
    id: "tt-content-1",
    platformId: "tiktok",
    category: "content",
    rule: "No dangerous challenges",
    keywords: ["challenge", "dangerous", "harmful trend"],
    severity: "critical",
    effectiveDate: "2026-01-20",
    description: "Content promoting dangerous challenges or trends"
  },
  // Instagram Policies
  {
    id: "ig-content-1",
    platformId: "instagram",
    category: "content",
    rule: "No misleading product claims",
    keywords: ["miracle", "instant result", "guaranteed", "cure"],
    severity: "high",
    effectiveDate: "2026-02-10",
    description: "False claims about product effectiveness"
  }
];

const PolicyRulesContext = createContext<PolicyRulesContextType | undefined>(undefined);

const STORAGE_KEY = "tubeclear_policy_rules";
const VERSIONS_KEY = "tubeclear_policy_versions";

export const PolicyRulesProvider = ({ children }: { children: ReactNode }) => {
  const [rules, setRules] = useState<PolicyRule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const [policyVersions, setPolicyVersions] = useState<Record<string, PolicyVersion>>(() => {
    try {
      const stored = localStorage.getItem(VERSIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [lastPolicyUpdate, setLastPolicyUpdate] = useState<string | null>(() => {
    try {
      return localStorage.getItem("tubeclear_last_policy_update");
    } catch {
      return null;
    }
  });

  const saveRules = useCallback((newRules: PolicyRule[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    setRules(newRules);
  }, []);

  const addRule = useCallback((rule: Omit<PolicyRule, "id">) => {
    const newRule: PolicyRule = {
      ...rule,
      id: `${rule.platformId}-${rule.category}-${Date.now()}`,
    };
    saveRules([...rules, newRule]);
  }, [rules, saveRules]);

  const updateRule = useCallback((id: string, updates: Partial<PolicyRule>) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    saveRules(updated);
  }, [rules, saveRules]);

  const deleteRule = useCallback((id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  }, [rules, saveRules]);

  const getRulesByPlatform = useCallback((platformId: string) => {
    return rules.filter((r) => r.platformId === platformId);
  }, [rules]);

  // Zero-API cost violation check - pure text matching
  const checkViolation = useCallback((text: string, platformId: string, category?: PolicyRule["category"]) => {
    const lowerText = text.toLowerCase();
    const platformRules = getRulesByPlatform(platformId);
    
    return platformRules
      .filter((rule) => !category || rule.category === category)
      .filter((rule) => {
        // Check if any keyword matches
        return rule.keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
      });
  }, [getRulesByPlatform]);

  const refreshPolicies = useCallback(async () => {
    // In production, this would fetch from backend
    // For now, we just update the timestamp
    const now = new Date().toISOString();
    localStorage.setItem("tubeclear_last_policy_update", now);
    setLastPolicyUpdate(now);
  }, []);

  return (
    <PolicyRulesContext.Provider
      value={{
        rules,
        policyVersions,
        addRule,
        updateRule,
        deleteRule,
        getRulesByPlatform,
        checkViolation,
        refreshPolicies,
        lastPolicyUpdate,
      }}
    >
      {children}
    </PolicyRulesContext.Provider>
  );
};

export const usePolicyRules = () => {
  const ctx = useContext(PolicyRulesContext);
  if (!ctx) throw new Error("usePolicyRules must be used within PolicyRulesProvider");
  return ctx;
};
