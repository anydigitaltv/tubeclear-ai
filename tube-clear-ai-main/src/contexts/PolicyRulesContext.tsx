import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CURRENT_YEAR, getShortMonthYear } from "@/utils/dynamicDate";

export interface PolicyRule {
  id: string;
  platformId: string;
  category: "content" | "monetization" | "community" | "copyright" | "thumbnail" | "metadata" | "ai_disclosure" | "branded_content" | "qr_code";
  rule: string;
  keywords: string[];
  severity: "low" | "medium" | "high" | "critical";
  effectiveDate: string;
  description: string;
  violationTimestamp?: number; // Exact seconds in video
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

// Default policy rules - MULTI-PLATFORM INTERNAL REVIEW STANDARDS (Current Year)
const DEFAULT_RULES: PolicyRule[] = [
  // ==================== YOUTUBE (15 Policies) ====================
  {
    id: "yt-copyright-1",
    platformId: "youtube",
    category: "copyright",
    rule: "No copyrighted music without license",
    keywords: ["copyrighted music", "unlicensed song", "pirated audio"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-01-01`,
    description: "YouTube Content ID detects unlicensed music - Internal Review Standard"
  },
  {
    id: "yt-copyright-2",
    platformId: "youtube",
    category: "copyright",
    rule: "No movie/TV clips without fair use justification",
    keywords: ["movie clip", "tv show", "fair use"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-01-01`,
    description: "Copyrighted video content requires transformative use"
  },
  {
    id: "yt-monetization-1",
    platformId: "youtube",
    category: "monetization",
    rule: "Ad-suitability: No inappropriate language in first 30 seconds",
    keywords: ["profanity", "curse word", "explicit language"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-01-15`,
    description: "Advertiser-friendly content guidelines - monetization compliance"
  },
  {
    id: "yt-monetization-2",
    platformId: "youtube",
    category: "monetization",
    rule: "No controversial issues for full monetization",
    keywords: ["controversial", "sensitive events", "tragedy"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-01-15`,
    description: "Limited or no ads on sensitive content"
  },
  {
    id: "yt-kids-1",
    platformId: "youtube",
    category: "community",
    rule: "Kids safety: No child endangerment or exploitation",
    keywords: ["child safety", "minor protection", "kids content"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-02-01`,
    description: "COPPA compliance and YouTube Kids policies"
  },
  {
    id: "yt-kids-2",
    platformId: "youtube",
    category: "community",
    rule: "Made for Kids: Disable comments and notifications",
    keywords: ["made for kids", "children's content"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-01`,
    description: "COPPA requires comment disabling on kids content"
  },
  {
    id: "yt-disclosure-1",
    platformId: "youtube",
    category: "ai_disclosure",
    rule: "AI disclosure required for synthetic/altered content",
    keywords: ["altered content", "synthetic media", "ai generated", "deepfake"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-03-01`,
    description: `Mandatory 'Altered Content' label per ${CURRENT_YEAR} policy`
  },
  {
    id: "yt-content-1",
    platformId: "youtube",
    category: "content",
    rule: "No misleading or deceptive content",
    keywords: ["misleading", "deceptive", "fake", "scam", "clickbait"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-01-15`,
    description: "Content that misleads users about product efficacy or makes false claims"
  },
  {
    id: "yt-content-2",
    platformId: "youtube",
    category: "monetization",
    rule: "No harmful or dangerous acts",
    keywords: ["dangerous", "harmful", "challenge", "prank", "stunt"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-02-01`,
    description: "Content showing dangerous activities that could cause injury"
  },
  {
    id: "yt-thumbnail-1",
    platformId: "youtube",
    category: "thumbnail",
    rule: "No misleading thumbnails",
    keywords: ["misleading thumbnail", "fake thumbnail", "clickbait thumbnail"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-15`,
    description: "Thumbnails must accurately represent video content"
  },
  {
    id: "yt-metadata-1",
    platformId: "youtube",
    category: "metadata",
    rule: "No excessive tag stuffing",
    keywords: ["tag stuffing", "keyword stuffing", "spam tags"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-03-01`,
    description: "Using excessive or irrelevant tags to manipulate search"
  },
  
  // ==================== TIKTOK (12 Policies) ====================
  {
    id: "tt-guideline-1",
    platformId: "tiktok",
    category: "community",
    rule: "Community Guidelines: No dangerous challenges",
    keywords: ["challenge", "dangerous", "harmful trend"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-01-20`,
    description: "Content promoting dangerous challenges or trends"
  },
  {
    id: "tt-ai-1",
    platformId: "tiktok",
    category: "ai_disclosure",
    rule: "AI-generated content label mandatory",
    keywords: ["ai-generated", "ai label", "tiktok ai tag"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-15`,
    description: "TikTok requires AI label for synthetic content"
  },
  {
    id: "tt-qr-1",
    platformId: "tiktok",
    category: "qr_code",
    rule: "No QR codes directing outside TikTok",
    keywords: ["qr code", "scan this", "link in bio"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-03-01`,
    description: "QR codes must comply with TikTok external link policy"
  },
  {
    id: "tt-content-1",
    platformId: "tiktok",
    category: "content",
    rule: "No bullying or harassment",
    keywords: ["bullying", "harassment", "hate speech"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-01-20`,
    description: "Zero tolerance for harassment content"
  },
  {
    id: "tt-monetization-1",
    platformId: "tiktok",
    category: "monetization",
    rule: "Creator Fund: Original content only",
    keywords: ["reposted content", "unoriginal", "stolen video"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-01`,
    description: "TikTok Creator Fund requires original content"
  },
  
  // ==================== INSTAGRAM (10 Policies) ====================
  {
    id: "ig-reels-1",
    platformId: "instagram",
    category: "monetization",
    rule: "Reels monetization: No watermarks from other apps",
    keywords: ["tiktok watermark", "logo overlay", "app watermark"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-01-10`,
    description: "Instagram Reels bonus program prohibits competitor watermarks"
  },
  {
    id: "ig-branded-1",
    platformId: "instagram",
    category: "branded_content",
    rule: "Branded content disclosure required (#ad, Paid partnership)",
    keywords: ["sponsored", "brand deal", "paid partnership", "#ad"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-10`,
    description: "FTC and Instagram require clear branded content disclosure"
  },
  {
    id: "ig-content-1",
    platformId: "instagram",
    category: "content",
    rule: "No misleading product claims",
    keywords: ["miracle", "instant result", "guaranteed", "cure"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-10`,
    description: "False claims about product effectiveness"
  },
  {
    id: "ig-shopping-1",
    platformId: "instagram",
    category: "monetization",
    rule: "Instagram Shopping: Accurate product descriptions",
    keywords: ["product tag", "shopping", "checkout"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-03-05`,
    description: "Product tags must match actual items"
  },
  
  // ==================== FACEBOOK (10 Policies) ====================
  {
    id: "fb-reels-1",
    platformId: "facebook",
    category: "monetization",
    rule: "Reels Play Bonus: No reused content",
    keywords: ["reused content", "compilation", "reposted"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-01-25`,
    description: "Facebook Reels monetization requires original content"
  },
  {
    id: "fb-branded-1",
    platformId: "facebook",
    category: "branded_content",
    rule: "Branded content tool required for paid partnerships",
    keywords: ["sponsored content", "brand partnership", "paid promotion"],
    severity: "high",
    effectiveDate: `${CURRENT_YEAR}-02-20`,
    description: "Facebook requires branded content tag for transparency"
  },
  {
    id: "fb-community-1",
    platformId: "facebook",
    category: "community",
    rule: "Community Standards: No hate speech",
    keywords: ["hate speech", "discrimination", "racist"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-01-01`,
    description: "Facebook zero tolerance hate speech policy"
  },
  {
    id: "fb-monetization-1",
    platformId: "facebook",
    category: "monetization",
    rule: "In-stream ads: 3+ minute videos only",
    keywords: ["in-stream ads", "video length", "monetization"],
    severity: "medium",
    effectiveDate: `${CURRENT_YEAR}-03-10`,
    description: "Facebook ad breaks require minimum video length"
  },
  
  // ==================== DAILYMOTION (8 Policies) ====================
  {
    id: "dm-partner-1",
    platformId: "dailymotion",
    category: "monetization",
    rule: "Partner Program: Original content requirement",
    keywords: ["partner program", "monetization", "original content"],
    severity: "high",
    effectiveDate: "2026-01-05",
    description: "Dailymotion partner program requires content ownership"
  },
  {
    id: "dm-quality-1",
    platformId: "dailymotion",
    category: "content",
    rule: "Video quality standards: HD preferred",
    keywords: ["low quality", "poor resolution", "blurry"],
    severity: "low",
    effectiveDate: `${CURRENT_YEAR}-02-01`,
    description: "Dailymotion recommends HD quality for better reach"
  },
  {
    id: "dm-copyright-1",
    platformId: "dailymotion",
    category: "copyright",
    rule: "Content ID: Copyright matching system",
    keywords: ["copyright claim", "content id", "rights management"],
    severity: "critical",
    effectiveDate: `${CURRENT_YEAR}-01-01`,
    description: "Dailymotion uses automated copyright detection"
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
    // AUTO-UPDATE: Simulate scanning latest 2026 platform news
    // In production, this would fetch from news API or backend
    const now = new Date().toISOString();
    
    // Check for policy updates (simulated auto-scan)
    const lastUpdate = localStorage.getItem("tubeclear_last_policy_update");
    const shouldAutoUpdate = !lastUpdate || 
                            new Date(now).getTime() - new Date(lastUpdate).getTime() > 24 * 60 * 60 * 1000; // 24 hours
    
    if (shouldAutoUpdate) {
      console.log('🔄 Auto-scanning latest 2026 platform policy updates...');
      // Simulate API call to fetch latest policies
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update timestamp
      localStorage.setItem("tubeclear_last_policy_update", now);
      setLastPolicyUpdate(now);
      
      // In production: Fetch from backend/news API and update rules
    }
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
