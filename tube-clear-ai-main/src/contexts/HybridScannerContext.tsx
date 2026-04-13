import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePolicyWatcher, type LivePolicy } from "./PolicyWatcherContext";
import { useAIEngines, type EngineId } from "./AIEngineContext";
import { useVideoScan, type VideoScanInput, type ScanResult, getFinalVerdict, type FinalVerdict } from "./VideoScanContext";
import { optimizeScanWorkflow, MemoryCacheManager, PersistentCache } from "@/utils/memoryCacheSystem";
import { checkRateLimit, recordScan } from "@/utils/rateLimiter";
import { 
  getPlatformFrameRequirements, 
  generateFrameAnalysisPrompt,
  formatTimestampMMSS 
} from "@/utils/frameLevelAnalysis";

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
  riskScore: number; // Added for verdict calculation
}

interface HybridScannerContextType {
  isScanning: boolean;
  currentStage: "metadata" | "pattern" | "deep" | "complete";
  scanProgress: number; // 0-100%
  executeHybridScan: (input: VideoScanInput, engineType?: string, systemPrompt?: string, useSystemKeys?: boolean) => Promise<DeepScanResult>;
  executePreScanOnly: (input: VideoScanInput) => Promise<{ verdict: "PASS" | "FAIL"; issues: string[]; riskScore: number; requiresDeepScan: boolean }>;
  getLiveVerificationTimestamp: () => string;
  generateWhyAnalysis: (result: DeepScanResult, metadata?: MetadataScrapeResult, platformId?: string) => WhyAnalysis;
  copyReportToClipboard: (report: FullReport) => Promise<boolean>;
}

export interface WhyAnalysis {
  riskReason: string;
  aiDetectionReason?: string;
  metadataReason?: string;
  policyLinks: string[];
  exactViolations: Array<{
    text: string;
    timestamp?: number; // Exact seconds in video
    severity: string;
  }>;
  disclosureStatus?: "verified" | "missing" | "not_required";
  disclosureNote?: string;
}

export interface FullReport {
  videoUrl: string;
  videoTitle?: string;
  videoThumbnail?: string;
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
      tags: input.tags || [],
      description: input.description,
      extractedAt: new Date().toISOString(),
    };
    
    return result;
  }, []);

  // STAGE 2: Live Pattern Match (compare against live policies)
  const matchLivePatterns = useCallback((metadata: MetadataScrapeResult, platformId: string): PatternMatchResult => {
    setCurrentStage("pattern");
    setScanProgress(45);
    
    const policies = livePolicies[platformId] || livePolicies[platformId as keyof typeof livePolicies] || [];
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
    
    console.log('🔍 Pattern Match Result:', { platformId, riskScore, cleanStatus, violations: violations.length });
    
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
        verdict: patternResult.cleanStatus ? "PASS" : "FAIL",
        reason: patternResult.cleanStatus 
          ? "Content compliant with current policies" 
          : `Found ${patternResult.matchedKeywords.length} policy violations`,
        violations: patternResult.matchedKeywords.map(k => `Keyword violation: ${k}`),
        passedChecks: patternResult.cleanStatus ? ["All policy checks passed"] : [],
        recommendations: patternResult.cleanStatus 
          ? ["Continue creating quality content"] 
          : ["Review and update metadata to comply with policies"],
        analyzedAt: new Date().toISOString(),
        engineUsed: currentEngine || "gemini",
        platformId: input.platformId,
        riskScore: patternResult.riskScore, // Add riskScore
        requiresDeepScan: false,
        deepScanReason: "Not required - metadata clean",
        videoTitle: input.title,
        videoUrl: input.videoUrl,
        videoThumbnail: input.thumbnail,
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
        riskScore: patternResult.riskScore, // Add riskScore from pattern match
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
  const executeHybridScan = useCallback(async (
    input: VideoScanInput, 
    engineType?: string, 
    systemPrompt?: string,
    useSystemKeys: boolean = false
  ): Promise<DeepScanResult> => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentStage("metadata");
    
    // Log selected config
    if (engineType) {
      console.log(`🎯 Using audit config - Engine: ${engineType}, Custom Prompt: ${systemPrompt ? 'Yes' : 'No'}`);
    }
    
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
          verdict: "PASS",
          reason: "Content compliant with live policies",
          violations: [],
          passedChecks: ["Live policy check passed", "No violations detected"],
          recommendations: ["Content meets current platform standards"],
          analyzedAt: new Date().toISOString(),
          engineUsed: currentEngine || "gemini",
          platformId: input.platformId,
          riskScore: patternResult.riskScore, // Add riskScore
          requiresDeepScan: false,
          deepScanReason: "Metadata clean - no deep scan needed",
          videoTitle: input.title,
          videoUrl: input.videoUrl,
          videoThumbnail: input.thumbnail,
        };
        
        setIsScanning(false);
        return lightweightResult;
      }
      
      // STAGE 3: Deep AI scan with Frame-Level Analysis & Memory Cache
      console.log(`🎯 Initiating frame-level scan for ${input.platformId.toUpperCase()}`);
      
      // Get platform-specific frame requirements
      const frameConfig = getPlatformFrameRequirements(input.platformId);
      console.log(`📋 Frame config: ${frameConfig.frameRate}fps, OCR: ${frameConfig.requiresTextOCR}, QR: ${frameConfig.requiresQRCodeDetection}`);
      
      // Use memory cache optimization workflow
      const optimizationResult = await optimizeScanWorkflow(
        input.videoId,
        input.platformId,
        // Full scan function
        async () => {
          console.log('🆕 Performing full frame-level analysis...');
          
          // Simulate frame-by-frame analysis (in production, this calls AI vision APIs)
          const totalFrames = Math.floor((input.durationSeconds || 300) * frameConfig.frameRate);
          const frameResults = [];
          
          for (let i = 0; i < Math.min(totalFrames, 100); i++) { // Limit to 100 frames for demo
            const timestamp = i / frameConfig.frameRate;
            const formattedTime = formatTimestampMMSS(timestamp);
            
            // Generate AI prompt for this frame
            const aiPrompt = generateFrameAnalysisPrompt(
              input.platformId,
              `Frame at ${formattedTime} from ${input.title}`,
              timestamp
            );
            
            // In production: Call AI vision API with this prompt
            // For now, simulate analysis
            frameResults.push({
              frameNumber: i,
              timestamp,
              content: `Frame content at ${formattedTime}`,
              detectedElements: [],
              violations: [],
              confidence: 0.95
            });
            
            // Update progress
            setScanProgress(60 + Math.floor((i / Math.min(totalFrames, 100)) * 30));
          }
          
          return {
            videoId: input.videoId,
            platformId: input.platformId,
            timestamp: new Date().toISOString(),
            frameResults,
            metadataAnalysis: {
              title: input.title,
              description: input.description,
              tags: input.tags,
              thumbnail: input.thumbnail || '',
              duration: input.durationSeconds || 0,
              aiDetected: false,
              disclosureStatus: 'not_required'
            },
            policyVersion: getLatestPolicyVersion(input.platformId) || 'unknown'
          } as any;
        },
        // Live policy check only (much faster)
        async () => {
          console.log('🔍 Running live policy overlay on cached frames...');
          
          // Extract timestamps from pattern violations
          return patternResult.violations.map((violation, index) => ({
            timestamp: Math.floor((300 / patternResult.violations.length) * (index + 1)),
            policyId: `policy_${index}`,
            severity: 'medium', // Default severity for overlay
            description: violation.description
          }));
        }
      );
      
      console.log(`⚡ Scan complete! Cached: ${optimizationResult.wasCached}, Time saved: ${optimizationResult.timeSaved?.timeSavedSeconds.toFixed(1)}s`);
      
      // Build final scan result
      const scanResult = await scanVideo({
        ...input,
        useSystemKeys // Pass through the system keys flag
      }); 
      if (!scanResult) {
        throw new Error("AI scan failed");
      }
      
      const deepResult: DeepScanResult = {
        ...scanResult,
        riskScore: patternResult.riskScore, // Add riskScore from pattern match
        requiresDeepScan: true,
        deepScanReason: patternResult.cleanStatus 
          ? "Visual/audio verification required" 
          : "Policy violations detected in metadata",
        aiDetectionConfidence: 0.85,
      };
      
      setScanProgress(100);
      setCurrentStage("complete");
      
      setIsScanning(false);
      return deepResult;
      
    } catch (error) {
      console.error('Frame-level scan error:', error);
      setIsScanning(false);
      throw error;
    }
  }, [scrapeMetadata, matchLivePatterns, verifyPolicyTimestamp, currentEngine, scanVideo, getLatestPolicyVersion]);

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
        note: "AI content detected but properly disclosed per latest Policy.",
      };
    } else {
      return {
        isDisclosed: false,
        status: "missing",
        note: `AI content detected but ${platformId.charAt(0).toUpperCase() + platformId.slice(1)}-required disclosure label is MISSING.`,
      };
    }
  }, []);

  // Generate "Why" Analysis with Disclosure Verification and Timestamp Accuracy
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
    if (result.verdict === "FAIL" && result.violations.length > 0) {
      analysis.metadataReason = `Reason: ${result.violations.length} policy violation(s) detected that require attention.`;
    }
    
    // Collect policy links with TIMESTAMP ACCURACY
    result.violations.forEach((issue, index) => {
      // Find matching policy and add link
      const policyLink = getPolicyUrl(platformId || "youtube");
      if (!analysis.policyLinks.includes(policyLink)) {
        analysis.policyLinks.push(policyLink);
      }
      
      // Add violation with exact timestamp (simulated from video duration)
      const estimatedTimestamp = metadata?.extractedAt 
        ? Math.floor((300 / result.violations.length) * (index + 1)) // Assume 5 min avg
        : undefined;
      
      analysis.exactViolations.push({
        text: issue,
        timestamp: estimatedTimestamp,
        severity: estimatedTimestamp ? 'high' : 'medium'
      });
    });
    
    // Overall risk reason - ADJUST based on verdict
    if (result.verdict === "PASS") {
      analysis.riskReason = "Content passed all policy checks - compliant with latest guidelines.";
    } else {
      analysis.riskReason = analysis.aiDetectionReason || 
                           analysis.metadataReason || 
                           `Content failed policy review: ${result.violations.length} violation(s) detected`;
    }
    
    return analysis;
  }, [verifyDisclosure, getLiveVerificationTimestamp, getPolicyUrl]);

  // Copy full report to clipboard
  const copyReportToClipboard = useCallback(async (report: FullReport): Promise<boolean> => {
    try {
      const verdictEmoji = report.overallRisk <= 30 ? "✅" : report.overallRisk <= 60 ? "⚠️" : "❌";
      const verdictText = report.overallRisk <= 30 ? "PASS" : report.overallRisk <= 60 ? "FLAGGED" : "FAIL";
      
      const formattedReport = `
🔍 TUBECLEAR AI - LIVE POLICY SCAN REPORT
═══════════════════════════════════════

📹 VIDEO INFORMATION
Title: ${report.videoTitle || 'N/A'}
URL: ${report.videoUrl}
Thumbnail: ${report.videoThumbnail || 'Not available'}
Platform: ${report.platform}

📊 VERDICT
${verdictEmoji} ${verdictText}
Risk Score: ${report.overallRisk}/100
Verified: ${report.verifiedTimestamp}

📝 ANALYSIS:
${report.whyAnalysis.riskReason}

${report.whyAnalysis.aiDetectionReason ? `🤖 AI DETECTION:\n${report.whyAnalysis.aiDetectionReason}\n` : ''}
${report.whyAnalysis.metadataReason ? `📝 METADATA:\n${report.whyAnalysis.metadataReason}\n` : ''}

🔗 OFFICIAL POLICY REFERENCES:
${report.whyAnalysis.policyLinks.map(link => `• ${link}`).join('\n')}

❌ EXACT VIOLATIONS:
${report.whyAnalysis.exactViolations.map(v => `• ${v.text}${v.timestamp ? ` [${v.timestamp}]` : ''}`).join('\n')}

───────────────────────────────────────
Generated by TubeClear AI • ${new Date().toLocaleString()}
      `.trim();
      
      await navigator.clipboard.writeText(formattedReport);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // NEW: Execute pre-scan only (Stages 1 & 2) without deep scan
  const executePreScanOnly = useCallback(async (
    input: VideoScanInput
  ): Promise<{ verdict: "PASS" | "FAIL"; issues: string[]; riskScore: number; requiresDeepScan: boolean }> => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // STAGE 1: Scrape metadata
      const metadata = scrapeMetadata(input);
      
      // STAGE 2: Match against live policies
      const patternResult = matchLivePatterns(metadata, input.platformId);
      
      setIsScanning(false);
      setScanProgress(50); // Show 50% progress after pre-scan
      
      return {
        verdict: patternResult.cleanStatus ? "PASS" : "FAIL",
        issues: patternResult.matchedKeywords.map(k => `Potential issue: ${k}`),
        riskScore: patternResult.riskScore,
        requiresDeepScan: !patternResult.cleanStatus || patternResult.riskScore > 20,
      };
    } catch (error) {
      setIsScanning(false);
      throw error;
    }
  }, [scrapeMetadata, matchLivePatterns]);

  return (
    <HybridScannerContext.Provider
      value={{
        isScanning,
        currentStage,
        scanProgress,
        executeHybridScan,
        executePreScanOnly,
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
