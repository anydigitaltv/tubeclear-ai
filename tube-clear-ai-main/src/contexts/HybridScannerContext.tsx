import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePolicyWatcher, type LivePolicy } from "./PolicyWatcherContext";
import { useAIEngines, type EngineId } from "./AIEngineContext";
import { useVideoScan, type VideoScanInput, type ScanResult } from "./VideoScanContext";

// Stage results
export interface MetadataScrapeResult {
  title: string;
  tags: string[];
  description: string;
  extractedAt: string;
}

export interface PatternMatchResult {
  violations: LivePolicy[];
  riskScore: number;
  matchedKeywords: string[];
  cleanStatus: boolean;
}

export interface DeepScanResult extends ScanResult {
  requiresDeepScan: boolean;
  deepScanReason: string;
  aiDetectionConfidence?: number;
}

interface HybridScannerContextType {
  isScanning: boolean;
  currentStage: "metadata" | "pattern" | "deep" | "complete";
  scanProgress: number; // 0-100%
  executeHybridScan: (input: VideoScanInput) => Promise<DeepScanResult>;
  getLiveVerificationTimestamp: () => string;
  generateWhyAnalysis: (result: DeepScanResult, metadata?: MetadataScrapeResult, platformId?: string) => WhyAnalysis;
  copyReportToClipboard: (report: FullReport) => Promise<boolean>;
}

export interface WhyAnalysis {
  riskReason: string;
  aiDetectionReason?: string;
  metadataReason?: string;
  policyLinks: string[];
  exactViolations: string[];
  disclosureStatus?: "verified" | "missing" | "not_required";
  disclosureNote?: string;
}

export interface FullReport {
  videoUrl: string;
  verifiedTimestamp: string;
  platform: string;
  overallRisk: number;
  whyAnalysis: WhyAnalysis;
  shareable: boolean;
  aiDetected: boolean;
  disclosureVerified: boolean;
}

const HybridScannerContext = createContext<HybridScannerContextType | undefined>(undefined);

export const HybridScannerProvider = ({ children }: { children: ReactNode }) => {
  const { 
    livePolicies, 
    verifyPolicyTimestamp, 
    getPolicyUrl,
    getLatestPolicyVersion 
  } = usePolicyWatcher();
  
  const { isEngineReady, currentEngine } = useAIEngines();
  const { scanVideo } = useVideoScan();
  
  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState<"metadata" | "pattern" | "deep" | "complete">("metadata");
  const [scanProgress, setScanProgress] = useState(0);

  // STAGE 1: Metadata Scraping ($0 cost)
  const scrapeMetadata = useCallback((input: VideoScanInput): MetadataScrapeResult => {
    setCurrentStage("metadata");
    setScanProgress(15);
    
    const result: MetadataScrapeResult = {
      title: input.title,
      tags: input.tags,
      description: input.description,
      extractedAt: new Date().toISOString(),
    };
    
    return result;
  }, []);

  // STAGE 2: Live Pattern Match (compare against live policies)
  const matchLivePatterns = useCallback((metadata: MetadataScrapeResult, platformId: string): PatternMatchResult => {
    setCurrentStage("pattern");
    setScanProgress(45);
    
    const policies = livePolicies[platformId] || [];
    const violations: LivePolicy[] = [];
    const matchedKeywords: string[] = [];
    
    // Combine metadata for analysis
    const fullText = `${metadata.title} ${metadata.description} ${metadata.tags.join(' ')}`.toLowerCase();
    
    // Check each live policy
    for (const policy of policies) {
      const hasViolation = policy.keywords.some(keyword => 
        fullText.includes(keyword.toLowerCase())
      );
      
      if (hasViolation) {
        violations.push(policy);
        matchedKeywords.push(...policy.keywords.filter(k => 
          fullText.includes(k.toLowerCase())
        ));
      }
    }
    
    // Calculate risk score based on violations
    const riskScore = Math.min(100, violations.length * 25 + matchedKeywords.length * 5);
    const cleanStatus = violations.length === 0 && riskScore < 20;
    
    const result: PatternMatchResult = {
      violations,
      riskScore,
      matchedKeywords: [...new Set(matchedKeywords)], // Unique
      cleanStatus,
    };
    
    return result;
  }, [livePolicies]);

  // STAGE 3: Deep AI Scan (only if needed)
  const executeDeepScan = useCallback(async (
    input: VideoScanInput,
    patternResult: PatternMatchResult
  ): Promise<DeepScanResult | null> => {
    setCurrentStage("deep");
    setScanProgress(75);
    
    // Determine if deep scan is required
    const requiresDeepScan = !patternResult.cleanStatus || 
                            input.thumbnail !== undefined ||
                            patternResult.riskScore > 30;
    
    if (!requiresDeepScan) {
      setScanProgress(100);
      setCurrentStage("complete");
      
      // Return lightweight result
      return {
        riskScore: patternResult.riskScore,
        riskLevel: patternResult.riskScore < 20 ? "low" : "medium",
        issues: patternResult.matchedKeywords.map(k => `Keyword violation: ${k}`),
        suggestions: ["Content appears compliant with current policies"],
        analyzedAt: new Date().toISOString(),
        engineUsed: currentEngine || "gemini",
        requiresDeepScan: false,
        deepScanReason: "Not required - metadata clean",
      };
    }
    
    // Execute actual AI scan
    try {
      const scanResult = await scanVideo({
        ...input,
        // Pass policy context to AI
      }); // Skip confirmation for hybrid scan
      
      if (!scanResult) {
        throw new Error("AI scan failed");
      }
      
      const deepResult: DeepScanResult = {
        ...scanResult,
        requiresDeepScan: true,
        deepScanReason: patternResult.cleanStatus 
          ? "Visual/audio verification required" 
          : "Policy violations detected in metadata",
        aiDetectionConfidence: 0.85, // Would come from AI model
      };
      
      setScanProgress(100);
      setCurrentStage("complete");
      
      return deepResult;
    } catch (error) {
      throw error;
    }
  }, [scanVideo, currentEngine]);

  // Main hybrid scan execution
  const executeHybridScan = useCallback(async (input: VideoScanInput): Promise<DeepScanResult> => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentStage("metadata");
    
    try {
      // Verify live policies before scan
      const verification = verifyPolicyTimestamp(input.platformId);
      
      // STAGE 1: Scrape metadata
      const metadata = scrapeMetadata(input);
      
      // STAGE 2: Match against live policies
      const patternResult = matchLivePatterns(metadata, input.platformId);
      
      // If clean and low risk, skip deep scan
      if (patternResult.cleanStatus && patternResult.riskScore < 20) {
        const lightweightResult: DeepScanResult = {
          riskScore: patternResult.riskScore,
          riskLevel: "low",
          issues: [],
          suggestions: ["Content compliant with live policies"],
          analyzedAt: new Date().toISOString(),
          engineUsed: currentEngine || "gemini",
          requiresDeepScan: false,
          deepScanReason: "Metadata clean - no deep scan needed",
        };
        
        setIsScanning(false);
        return lightweightResult;
      }
      
      // STAGE 3: Deep AI scan (if needed)
      const deepResult = await executeDeepScan(input, patternResult);
      
      if (!deepResult) {
        throw new Error("Deep scan returned null");
      }
      
      setIsScanning(false);
      return deepResult;
      
    } catch (error) {
      setIsScanning(false);
      throw error;
    }
  }, [scrapeMetadata, matchLivePatterns, executeDeepScan, verifyPolicyTimestamp, currentEngine]);

  // Get live verification timestamp
  const getLiveVerificationTimestamp = useCallback((): string => {
    const platforms = Object.keys(livePolicies);
    if (platforms.length === 0) return "Not verified";
    
    const latest = platforms.reduce((latest, platform) => {
      const status = verifyPolicyTimestamp(platform);
      return new Date(status.verifiedAt) > new Date(latest) ? status.verifiedAt : latest;
    }, new Date(0).toISOString());
    
    return new Date(latest).toLocaleString();
  }, [livePolicies, verifyPolicyTimestamp]);

  // DISCLOSURE VERIFICATION: Check platform-specific AI disclosure labels
  const verifyDisclosure = useCallback((
    metadata: MetadataScrapeResult,
    platformId: string,
    aiDetected: boolean
  ): { isDisclosed: boolean; status: "verified" | "missing" | "not_required"; note?: string } => {
    if (!aiDetected) {
      return { isDisclosed: true, status: "not_required", note: "No AI content detected - disclosure not required" };
    }

    const fullText = `${metadata.title} ${metadata.description} ${metadata.tags.join(' ')}`.toLowerCase();
    
    // Platform-specific disclosure patterns
    const disclosurePatterns: Record<string, RegExp[]> = {
      youtube: [
        /altered content/i,
        /synthetic media/i,
        /ai generated/i,
        /ai-created/i,
        /artificial intelligence/i,
        /\bAI\b.*content/i,
      ],
      tiktok: [
        /ai-generated/i,
        /ai generated/i,
        /ai label/i,
        /tiktok ai tag/i,
        /\bAI\b.*tag/i,
      ],
      facebook: [
        /made with ai/i,
        /created with ai/i,
        /ai-generated content/i,
        /meta ai label/i,
        /\bAI\b.*facebook/i,
      ],
      instagram: [
        /made with ai/i,
        /created with ai/i,
        /ai-generated content/i,
        /meta ai label/i,
        /ig ai label/i,
      ],
      dailymotion: [
        /ai disclosure/i,
        /ai generated/i,
        /artificial intelligence/i,
        /dailymotion ai/i,
        /\bAI\b.*video/i,
      ],
    };

    const patterns = disclosurePatterns[platformId] || [];
    
    // Check if any disclosure pattern matches
    const isDisclosed = patterns.some(pattern => pattern.test(fullText));
    
    if (isDisclosed) {
      return {
        isDisclosed: true,
        status: "verified",
        note: "AI content detected but properly disclosed per 2026 Policy.",
      };
    } else {
      return {
        isDisclosed: false,
        status: "missing",
        note: `AI content detected but ${platformId.charAt(0).toUpperCase() + platformId.slice(1)}-required disclosure label is MISSING.`,
      };
    }
  }, []);

  // Generate "Why" Analysis with Disclosure Verification
  const generateWhyAnalysis = useCallback((result: DeepScanResult, metadata?: MetadataScrapeResult, platformId?: string): WhyAnalysis => {
    const analysis: WhyAnalysis = {
      riskReason: "",
      policyLinks: [],
      exactViolations: [],
      disclosureStatus: "not_required",
    };
    
    // AI Detection reason
    const aiDetected = result.aiDetectionConfidence && result.aiDetectionConfidence > 0.7;
    
    if (aiDetected && metadata && platformId) {
      // Check disclosure verification
      const disclosureCheck = verifyDisclosure(metadata, platformId, aiDetected);
      analysis.disclosureStatus = disclosureCheck.status;
      analysis.disclosureNote = disclosureCheck.note;
      
      if (disclosureCheck.isDisclosed) {
        // PROPERLY DISCLOSED - Change to PASS
        analysis.aiDetectionReason = `Reason: AI elements detected but PROPERLY DISCLOSED. ${disclosureCheck.note}`;
      } else {
        // MISSING DISCLOSURE - Keep as WARNING
        analysis.aiDetectionReason = `Reason: Potential AI elements found. Per ${getLiveVerificationTimestamp()} Policy, an 'Altered Content' label is MANDATORY.`;
      }
    } else if (aiDetected) {
      analysis.aiDetectionReason = `Reason: Potential AI elements found. Per ${getLiveVerificationTimestamp()} Policy, disclosure is required.`;
    }
    
    // Metadata analysis
    if (result.riskScore > 0 && result.riskScore <= 50) {
      analysis.metadataReason = `Reason: Clickbait keywords detected that violate current metadata standards. Risk Score: ${result.riskScore}/100`;
    }
    
    // Collect policy links
    result.issues.forEach(issue => {
      // Find matching policy and add link
      const policyLink = getPolicyUrl(platformId || "youtube");
      if (!analysis.policyLinks.includes(policyLink)) {
        analysis.policyLinks.push(policyLink);
      }
      analysis.exactViolations.push(issue);
    });
    
    // Overall risk reason - ADJUST based on disclosure status
    if (analysis.disclosureStatus === "verified") {
      analysis.riskReason = "AI content properly disclosed - compliant with 2026 Policy.";
    } else {
      analysis.riskReason = analysis.aiDetectionReason || 
                           analysis.metadataReason || 
                           `Overall Risk Assessment: ${result.riskLevel.toUpperCase()}`;
    }
    
    return analysis;
  }, [verifyDisclosure, getLiveVerificationTimestamp, getPolicyUrl]);

  // Copy full report to clipboard
  const copyReportToClipboard = useCallback(async (report: FullReport): Promise<boolean> => {
    try {
      const formattedReport = `
🔍 TUBECLEAR AI - LIVE POLICY SCAN REPORT
═══════════════════════════════════════

📹 Video: ${report.videoUrl}
✅ Verified: ${report.verifiedTimestamp}
📺 Platform: ${report.platform}
⚠️ Overall Risk: ${report.overallRisk}/100

📊 WHY ANALYSIS:
${report.whyAnalysis.riskReason}

${report.whyAnalysis.aiDetectionReason ? `🤖 AI DETECTION:\n${report.whyAnalysis.aiDetectionReason}\n` : ''}
${report.whyAnalysis.metadataReason ? `📝 METADATA:\n${report.whyAnalysis.metadataReason}\n` : ''}

🔗 OFFICIAL POLICY REFERENCES:
${report.whyAnalysis.policyLinks.map(link => `• ${link}`).join('\n')}

❌ EXACT VIOLATIONS:
${report.whyAnalysis.exactViolations.map(v => `• ${v}`).join('\n')}

───────────────────────────────────────
Generated by TubeClear AI • ${new Date().toLocaleString()}
      `.trim();
      
      await navigator.clipboard.writeText(formattedReport);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return (
    <HybridScannerContext.Provider
      value={{
        isScanning,
        currentStage,
        scanProgress,
        executeHybridScan,
        getLiveVerificationTimestamp,
        generateWhyAnalysis,
        copyReportToClipboard,
      }}
    >
      {children}
    </HybridScannerContext.Provider>
  );
};

export const useHybridScanner = () => {
  const ctx = useContext(HybridScannerContext);
  if (!ctx) throw new Error("useHybridScanner must be used within HybridScannerProvider");
  return ctx;
};
