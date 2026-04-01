import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  requiredFeatures: string[];
  platform: "playstore" | "appstore" | "youtube" | "tiktok" | "general";
  lastUpdated: string;
}

export interface PrivacyPolicy {
  version: string;
  generatedAt: string;
  sections: PolicySection[];
  isActive: boolean;
}

interface DynamicComplianceContextType {
  privacyPolicy: PrivacyPolicy | null;
  termsOfService: PrivacyPolicy | null;
  activeFeatures: string[];
  generatePrivacyPolicy: () => PrivacyPolicy;
  generateTermsOfService: () => PrivacyPolicy;
  setActiveFeatures: (features: string[]) => void;
  addFeature: (feature: string) => void;
  removeFeature: (feature: string) => void;
  getComplianceStatus: () => { compliant: boolean; missing: string[] };
  exportPolicy: (type: "privacy" | "terms") => string;
}

const DEFAULT_PRIVACY_SECTIONS: Omit<PolicySection, "lastUpdated">[] = [
  {
    id: "data-collection",
    title: "Data Collection",
    content: "TubeClear collects video metadata (titles, descriptions, tags) for policy compliance analysis. We do not collect personal information beyond what is necessary for authentication.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "api-keys",
    title: "User API Keys (BYOK)",
    content: "Users may provide their own API keys (BYOK - Bring Your Own Key) for AI analysis. These keys are stored locally on the user's device and are never transmitted to our servers except for direct API calls.",
    requiredFeatures: ["byok"],
    platform: "general",
  },
  {
    id: "third-party-ai",
    title: "Third-Party AI Services",
    content: "TubeClear uses third-party AI services (OpenAI, Gemini, Claude) for content analysis. User content is processed by these services according to their respective privacy policies.",
    requiredFeatures: ["ai_engines"],
    platform: "general",
  },
  {
    id: "youtube-api",
    title: "YouTube API Integration",
    content: "TubeClear uses YouTube Data API to fetch video metadata. We comply with YouTube's API Services User Data Policy, including the Limited Use requirements.",
    requiredFeatures: ["youtube"],
    platform: "youtube",
  },
  {
    id: "advertising",
    title: "Advertising",
    content: "We may display advertisements to support our free tier. Ads are served by third-party networks and may collect device information for targeting purposes.",
    requiredFeatures: ["ads"],
    platform: "playstore",
  },
  {
    id: "in-app-purchases",
    title: "In-App Purchases",
    content: "TubeClear offers virtual coins and premium features for purchase. All purchases are processed through the platform's official payment system.",
    requiredFeatures: ["coins", "premium"],
    platform: "playstore",
  },
  {
    id: "user-content",
    title: "User-Generated Content",
    content: "Users can scan video content for policy compliance. We do not store video files; only metadata is analyzed and temporarily cached.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "cookies-tracking",
    title: "Cookies and Tracking",
    content: "We use essential cookies to maintain user sessions and preferences. We do not use tracking cookies for advertising purposes.",
    requiredFeatures: ["auth"],
    platform: "general",
  },
  {
    id: "data-retention",
    title: "Data Retention",
    content: "Scan history is retained for 30 days for authenticated users. Guest data is cleared after the session ends. Users can request data deletion at any time.",
    requiredFeatures: ["auth", "scan"],
    platform: "general",
  },
  {
    id: "children-privacy",
    title: "Children's Privacy",
    content: "TubeClear is not intended for users under 13 years of age. We do not knowingly collect information from children.",
    requiredFeatures: ["auth"],
    platform: "playstore",
  },
  {
    id: "thumbnail-analysis",
    title: "Image Analysis",
    content: "For thumbnail analysis, images are processed using AI vision APIs. Images are not stored after analysis completion.",
    requiredFeatures: ["thumbnail_scan"],
    platform: "general",
  },
];

const DEFAULT_TERMS_SECTIONS: Omit<PolicySection, "lastUpdated">[] = [
  {
    id: "service-description",
    title: "Service Description",
    content: "TubeClear is a content policy compliance tool for video creators. We analyze video metadata against platform policies to identify potential violations.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    content: "Users are responsible for the content they submit for analysis. TubeClear does not guarantee that all policy violations will be detected.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "api-usage",
    title: "API Key Usage",
    content: "Users providing their own API keys (BYOK) are responsible for managing their API quotas and costs. TubeClear is not responsible for API overages or billing issues.",
    requiredFeatures: ["byok"],
    platform: "general",
  },
  {
    id: "limitations",
    title: "Service Limitations",
    content: "TubeClear does not analyze LIVE videos, comments, or real-time streams. Any policy violations from these sources are not covered by our service.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "indemnification",
    title: "Indemnification",
    content: "Users agree to indemnify TubeClear against any claims arising from policy violations on their content.",
    requiredFeatures: ["scan"],
    platform: "general",
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    content: "TubeClear is an AI-assisted tool and may produce false positives or negatives. Always verify results with official platform guidelines.",
    requiredFeatures: ["ai_engines"],
    platform: "general",
  },
  {
    id: "modifications",
    title: "Terms Modifications",
    content: "We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.",
    requiredFeatures: [],
    platform: "general",
  },
];

const DynamicComplianceContext = createContext<DynamicComplianceContextType | undefined>(undefined);

const PRIVACY_STORAGE_KEY = "tubeclear_privacy_policy";
const TERMS_STORAGE_KEY = "tubeclear_terms_of_service";
const FEATURES_STORAGE_KEY = "tubeclear_active_features";

export const DynamicComplianceProvider = ({ children }: { children: ReactNode }) => {
  const [activeFeatures, setActiveFeaturesState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FEATURES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ["scan", "auth", "ai_engines", "byok"];
    } catch {
      return ["scan", "auth", "ai_engines", "byok"];
    }
  });

  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacyPolicy | null>(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [termsOfService, setTermsOfService] = useState<PrivacyPolicy | null>(() => {
    try {
      const stored = localStorage.getItem(TERMS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveFeatures = useCallback((features: string[]) => {
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(features));
    setActiveFeaturesState(features);
  }, []);

  const addFeature = useCallback((feature: string) => {
    if (!activeFeatures.includes(feature)) {
      setActiveFeatures([...activeFeatures, feature]);
    }
  }, [activeFeatures, setActiveFeatures]);

  const removeFeature = useCallback((feature: string) => {
    setActiveFeatures(activeFeatures.filter((f) => f !== feature));
  }, [activeFeatures, setActiveFeatures]);

  const generatePrivacyPolicy = useCallback((): PrivacyPolicy => {
    const now = new Date().toISOString();
    const relevantSections = DEFAULT_PRIVACY_SECTIONS
      .filter((section) => {
        if (section.requiredFeatures.length === 0) return true;
        return section.requiredFeatures.some((f) => activeFeatures.includes(f));
      })
      .map((section) => ({ ...section, lastUpdated: now }));

    const policy: PrivacyPolicy = {
      version: `1.${Date.now()}`,
      generatedAt: now,
      sections: relevantSections,
      isActive: true,
    };

    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(policy));
    setPrivacyPolicy(policy);
    return policy;
  }, [activeFeatures]);

  const generateTermsOfService = useCallback((): PrivacyPolicy => {
    const now = new Date().toISOString();
    const relevantSections = DEFAULT_TERMS_SECTIONS
      .filter((section) => {
        if (section.requiredFeatures.length === 0) return true;
        return section.requiredFeatures.some((f) => activeFeatures.includes(f));
      })
      .map((section) => ({ ...section, lastUpdated: now }));

    const policy: PrivacyPolicy = {
      version: `1.${Date.now()}`,
      generatedAt: now,
      sections: relevantSections,
      isActive: true,
    };

    localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify(policy));
    setTermsOfService(policy);
    return policy;
  }, [activeFeatures]);

  const getComplianceStatus = useCallback(() => {
    const required = ["data-collection", "user-responsibilities", "limitations", "disclaimer"];
    const currentSections = privacyPolicy?.sections.map((s) => s.id) || [];
    const missing = required.filter((r) => !currentSections.includes(r));
    return { compliant: missing.length === 0, missing };
  }, [privacyPolicy]);

  const exportPolicy = useCallback((type: "privacy" | "terms"): string => {
    const policy = type === "privacy" ? privacyPolicy : termsOfService;
    if (!policy) return "";

    const header = `# ${type === "privacy" ? "Privacy Policy" : "Terms of Service"}\n\nGenerated: ${policy.generatedAt}\nVersion: ${policy.version}\n\n---\n\n`;
    const body = policy.sections
      .map((s) => `## ${s.title}\n\n${s.content}\n\n_Last updated: ${s.lastUpdated}_\n`)
      .join("\n---\n\n");

    return header + body;
  }, [privacyPolicy, termsOfService]);

  useEffect(() => {
    if (activeFeatures.length > 0) {
      generatePrivacyPolicy();
      generateTermsOfService();
    }
  }, [activeFeatures, generatePrivacyPolicy, generateTermsOfService]);

  return (
    <DynamicComplianceContext.Provider
      value={{
        privacyPolicy,
        termsOfService,
        activeFeatures,
        generatePrivacyPolicy,
        generateTermsOfService,
        setActiveFeatures,
        addFeature,
        removeFeature,
        getComplianceStatus,
        exportPolicy,
      }}
    >
      {children}
    </DynamicComplianceContext.Provider>
  );
};

export const useDynamicCompliance = () => {
  const ctx = useContext(DynamicComplianceContext);
  if (!ctx) throw new Error("useDynamicCompliance must be used within DynamicComplianceProvider");
  return ctx;
};
