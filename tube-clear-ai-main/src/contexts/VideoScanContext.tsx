import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatforms, type PlatformId } from "@/contexts/PlatformContext";
import { useAIEngines, type EngineId } from "@/contexts/AIEngineContext";
import { useFeatureStore } from "@/contexts/FeatureStoreContext";
import { useCoins } from "@/contexts/CoinContext";

export interface VideoScanInput {
  videoId: string;
  platformId: PlatformId;
  title: string;
  description: string;
  tags: string[];
  thumbnail?: string;
  videoUrl?: string;
  durationSeconds?: number; // Added for dynamic pricing
  requiresDeepScan?: boolean; // Indicates if deep scan is needed
  useSystemKeys?: boolean; // Force use of Admin keys (Coin-based)
}

// Platform Moderator Final Verdict
export type FinalVerdict = "PASS" | "FLAGGED" | "FAILED";

// Platform-specific thresholds for verdicts
const PLATFORM_THRESHOLDS = {
  youtube: { pass: 30, flagged: 60 },
  tiktok: { pass: 25, flagged: 55 },
  instagram: { pass: 28, flagged: 58 },
  facebook: { pass: 30, flagged: 60 },
  dailymotion: { pass: 30, flagged: 60 },
};

// Calculate final verdict based on risk score and platform
export const getFinalVerdict = (riskScore: number, platformId: PlatformId): FinalVerdict => {
  const threshold = PLATFORM_THRESHOLDS[platformId] || PLATFORM_THRESHOLDS.youtube;
  
  if (riskScore <= threshold.pass) return "PASS";
  if (riskScore <= threshold.flagged) return "FLAGGED";
  return "FAILED";
};

export interface ScanResult {
  verdict: "PASS" | "FAIL";
  reason: string;
  violations: string[];
  passedChecks: string[];
  recommendations: string[];
  analyzedAt: string;
  engineUsed: EngineId;
  platformId: PlatformId;
  // Video information for reports
  videoTitle?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  thumbnailStatus?: "safe" | "flagged" | "not_scanned" | "unsupported";
  thumbnailIssues?: string[];
  tokensSaved?: number; // Loyalty feature - shows money saved by free scans
}

export interface ThumbnailScanResult {
  status: "safe" | "flagged" | "not_scanned" | "unsupported";
  issues: string[];
  disclaimer?: string;
}

export interface VideoScanRecord {
  id: string;
  user_id: string;
  video_id: string;
  platform_id: PlatformId;
  title: string;
  description: string;
  tags: string[];
  scan_result: ScanResult;
  created_at: string;
}

interface VideoScanContextType {
  scanVideo: (input: VideoScanInput) => Promise<ScanResult | null>;
  scanThumbnail: (thumbnailUrl: string, videoTitle: string) => Promise<ThumbnailScanResult>;
  getScanHistory: () => Promise<VideoScanRecord[]>;
  isScanning: boolean;
  lastScanResult: ScanResult | null;
  canScanForFree: (platformId: PlatformId) => boolean;
  requiresPayment: (platformId: PlatformId) => boolean;
  supportsVision: (engineId: EngineId) => boolean;
}

// Parse video duration from various formats
const parseDuration = (durationStr: string): number | null => {
  if (!durationStr) return null;
  
  try {
    // Format: "HH:MM:SS" or "MM:SS" or ISO 8601 "PT1H2M3S"
    if (durationStr.includes('PT')) {
      // ISO 8601 format
      const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        return hours * 3600 + minutes * 60 + seconds;
      }
    } else {
      // HH:MM:SS or MM:SS format
      const parts = durationStr.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }
  } catch (error) {
    console.error('Error parsing duration:', error);
  }
  
  return null;
};

// Calculate scan cost based on duration
const calculateScanCost = (durationSeconds?: number): { cost: number; warning?: string } => {
  if (!durationSeconds || durationSeconds <= 0) {
    // Default to Standard pricing with warning
    return { cost: 5, warning: 'Unable to detect video duration. Using Standard pricing (5 coins).' };
  }
  
  if (durationSeconds < 60) {
    return { cost: 2 }; // Shorts
  } else if (durationSeconds <= 600) {
    return { cost: 5 }; // Standard (1-10 min)
  } else if (durationSeconds <= 1800) {
    return { cost: 10 }; // Long (10-30 min)
  } else {
    return { cost: 20 }; // Deep Scan (>30 min)
  }
};

// Engines that support Vision API
const VISION_SUPPORTED_ENGINES: EngineId[] = ["gemini"];

// Platform-specific scan prompts for 5 platforms
const SCAN_PROMPTS: Record<PlatformId, string> = {
  youtube: `You are a YouTube Policy Expert analyzing content for monetization compliance under YouTube Partner Program (YPP) 2026 policies.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for YouTube-specific violations:
1. **Reused/Repetitious Content**: Same format, minimal variation, mass-produced content
2. **AI-Generated Content**: Undisclosed AI voice, deepfakes, synthetic visuals (Altered Content label mandatory)
3. **Copyright Issues**: Unlicensed music, reuploaded content, watermark violations
4. **Advertiser-Friendly Guidelines**: Sensitive topics, profanity, controversial content
5. **Misleading Metadata**: Clickbait titles, keyword stuffing, deceptive thumbnails
6. **Kids Safety**: COPPA compliance, child-directed content标记

DECISION FORMAT - You MUST respond with PASS or FAIL:
{
  "verdict": "PASS" | "FAIL",
  "reason": "Clear explanation of why content passed or failed",
  "violations": ["Specific policy violation 1", "violation 2"],
  "passedChecks": ["What policies were satisfied"],
  "recommendations": ["Actionable steps if FAIL"]
}

IMPORTANT: 
- PASS = Content meets YouTube monetization standards
- FAIL = Content violates one or more YouTube policies and risks demonetization
- Be strict. If ANY major violation exists, verdict must be FAIL.`,

  tiktok: `You are a TikTok Policy Expert analyzing content for Community Guidelines and Creator Fund compliance 2026.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for TikTok-specific violations:
1. **AI-Generated Content Label**: Mandatory disclosure for AI-generated/edited content
2. **QR Code Violations**: External QR codes redirecting to prohibited platforms
3. **Music Copyright**: Unlicensed commercial music usage
4. **Community Guidelines**: Violence, hate speech, dangerous acts, misinformation
5. **Duet/Stitch Rights**: Content eligibility for remix features
6. **Short-Form Quality**: Extremely low effort, spam-like content patterns

DECISION FORMAT - You MUST respond with PASS or FAIL:
{
  "verdict": "PASS" | "FAIL",
  "reason": "Clear explanation of why content passed or failed",
  "violations": ["Specific policy violation 1", "violation 2"],
  "passedChecks": ["What policies were satisfied"],
  "recommendations": ["Actionable steps if FAIL"]
}

IMPORTANT:
- PASS = Content meets TikTok Community Guidelines and monetization standards
- FAIL = Content violates TikTok policies and risks removal or demonetization
- TikTok is stricter on AI disclosure and QR codes - flag immediately if missing`,

  instagram: `You are an Instagram Policy Expert analyzing content for Partner Monetization Policies 2026.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for Instagram-specific violations:
1. **Branded Content Disclosure**: Missing "Paid Partnership" tag for sponsored content
2. **Reels Monetization**: Content eligibility for Reels Play bonus program
3. **Music Licensing**: Commercial music rights for Reels/IGTV
4. **Authentic Engagement**: Buy/fake engagement, follow-for-follow schemes
5. **Content Authenticity**: Reposted content without transformation, watermark from other apps
6. **Community Guidelines**: Nudity, violence, hate speech, self-harm content

DECISION FORMAT - You MUST respond with PASS or FAIL:
{
  "verdict": "PASS" | "FAIL",
  "reason": "Clear explanation of why content passed or failed",
  "violations": ["Specific policy violation 1", "violation 2"],
  "passedChecks": ["What policies were satisfied"],
  "recommendations": ["Actionable steps if FAIL"]
}

IMPORTANT:
- PASS = Content meets Instagram Partner Monetization Policies
- FAIL = Content violates Instagram policies and risks monetization restrictions
- Branded content without disclosure = immediate FAIL`,

  facebook: `You are a Facebook Policy Expert analyzing content for In-Stream Ads and Partner Monetization 2026.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for Facebook-specific violations:
1. **Partner Monetization Policies**: Page authenticity, admin location restrictions
2. **In-Stream Ads Eligibility**: Video length (3+ minutes), original content requirements
3. **Content Authenticity**: Repurposed content from other creators without significant value-add
4. **Limited Originality of Content (LOC)**: Compilations, memes, reactions without commentary
5. **Community Standards**: Violence, hate speech, misinformation, adult content
6. **Advertiser-Friendly Content**: Brand safety considerations for in-stream ads

DECISION FORMAT - You MUST respond with PASS or FAIL:
{
  "verdict": "PASS" | "FAIL",
  "reason": "Clear explanation of why content passed or failed",
  "violations": ["Specific policy violation 1", "violation 2"],
  "passedChecks": ["What policies were satisfied"],
  "recommendations": ["Actionable steps if FAIL"]
}

IMPORTANT:
- PASS = Content meets Facebook Partner Monetization and In-Stream Ads policies
- FAIL = Content violates Facebook policies and risks monetization disablement
- LOC (Limited Originality) is major issue - flag compilations/reposts without commentary`,

  dailymotion: `You are a Dailymotion Policy Expert analyzing content for Partner Program and Premium Monetization 2026.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for Dailymotion-specific violations:
1. **Content Quality Standards**: HD quality, professional production value
2. **Partner Program Eligibility**: Original content, consistent upload schedule
3. **Premium Content Requirements**: Exclusive content, premium advertiser standards
4. **Copyright Compliance**: Licensed music, original footage, proper attributions
5. **Community Guidelines**: No violence, hate speech, adult content, illegal activities
6. **Brand Safety**: Advertiser-friendly content suitable for premium placements

DECISION FORMAT - You MUST respond with PASS or FAIL:
{
  "verdict": "PASS" | "FAIL",
  "reason": "Clear explanation of why content passed or failed",
  "violations": ["Specific policy violation 1", "violation 2"],
  "passedChecks": ["What policies were satisfied"],
  "recommendations": ["Actionable steps if FAIL"]
}

IMPORTANT:
- PASS = Content meets Dailymotion Partner Program and quality standards
- FAIL = Content violates Dailymotion policies or quality requirements
- Dailymotion emphasizes premium quality - flag low-effort or unoriginal content`
};

// Scan prompt for AI analysis (legacy - keeping for backward compatibility)
const SCAN_PROMPT = SCAN_PROMPTS.youtube;

// Thumbnail scan prompt for Vision API
const THUMBNAIL_SCAN_PROMPT = `You are a YouTube/content policy expert. Analyze this video thumbnail for policy violations.

Check for:
1. Misleading or clickbait imagery
2. Inappropriate content (violence, nudity, etc.)
3. Copyright concerns (logos, watermarks, celebrity images)
4. Advertiser-friendly concerns

Respond in JSON format:
{
  "status": "<safe|flagged>",
  "issues": ["<issue1>", "<issue2>"]
}`;

// Disclaimer message for unsupported keys
const VISION_UNSUPPORTED_DISCLAIMER = "Aapki key Thumbnail scan support nahi karti, Tubeclear zimmedar nahi hai.";

const VideoScanContext = createContext<VideoScanContextType | undefined>(undefined);

export const VideoScanProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const { platforms, primaryPlatform } = usePlatforms();
  const { currentEngine, apiKeys, switchToNextEngine, isEngineReady, allEnginesFailed } = useAIEngines();
  const { isFeatureActive } = useFeatureStore();
  const { canAfford, spendCoins } = useCoins();
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  // Check if user is paid (has agency_mode or other paid features)
  const isPaidUser = useCallback((): boolean => {
    return isFeatureActive("agency_mode") || isFeatureActive("auto_scan");
  }, [isFeatureActive]);

  // Check if platform is primary (free scan allowed)
  const isPrimaryPlatform = useCallback((platformId: PlatformId): boolean => {
    return primaryPlatform?.id === platformId;
  }, [primaryPlatform]);

  // Check if user can scan for free (ALL SCANS ARE NOW FREE)
  const canScanForFree = useCallback((platformId: PlatformId): boolean => {
    // All scans are free for everyone (guest and login)
    return true;
  }, []);

  // Check if scan requires payment (ALWAYS FALSE - ALL FREE)
  const requiresPayment = useCallback((platformId: PlatformId): boolean => {
    // No payment required - all scans are free
    return false;
  }, []);

  // Check if engine supports Vision API
  const supportsVision = useCallback((engineId: EngineId): boolean => {
    return VISION_SUPPORTED_ENGINES.includes(engineId);
  }, []);

  // Call AI API with user's BYOK key
  const callWithBYOK = async (engineId: EngineId, prompt: string): Promise<string | null> => {
    const keyData = apiKeys[engineId];
    if (!keyData?.key || keyData.status !== "ready") {
      return null;
    }

    // Simulate API call (replace with actual API calls per engine)
    // In production, each engine would have different API endpoints and formats
    try {
      const response = {
        verdict: "PASS",
        reason: "Content meets platform monetization standards",
        violations: [],
        passedChecks: ["Community guidelines compliant", "No copyright issues detected"],
        recommendations: ["Continue creating quality content"],
      };
      return JSON.stringify(response);
    } catch (error) {
      console.error("BYOK API call failed:", error);
      return null;
    }
  };

  // Call Vision API for thumbnail scanning
  const callVisionAPI = async (engineId: EngineId, thumbnailUrl: string, prompt: string): Promise<string | null> => {
    const keyData = apiKeys[engineId];
    if (!keyData?.key || keyData.status !== "ready") {
      return null;
    }

    // Check if engine supports Vision
    if (!supportsVision(engineId)) {
      return null;
    }

    // Simulate Vision API call (replace with actual API calls per engine)
    // In production:
    // - OpenAI: Use GPT-4 Vision API
    // - Gemini: Use Gemini Pro Vision API
    // - Claude: Use Claude 3 with vision capabilities
    try {
      // Simulate response
      const isFlagged = Math.random() > 0.7;
      const response = {
        status: isFlagged ? "flagged" : "safe",
        issues: isFlagged ? ["Potential clickbait imagery detected", "Consider revising thumbnail"] : [],
      };
      return JSON.stringify(response);
    } catch (error) {
      console.error("Vision API call failed:", error);
      return null;
    }
  };

  // Call Admin API (for paid users)
  const callWithAdminAPI = async (prompt: string, engine: EngineId): Promise<string | null> => {
    try {
      // Invoke Supabase Edge Function 'ai-proxy'
      // Ye function backend par system_vault se keys rotate karega
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { 
          prompt, 
          engine, 
          userId: user?.id,
          scanMode: "admin_vault" 
        }
      });

      if (error) throw error;
      
      // Return result as string to match existing parser
      return JSON.stringify(data);
    } catch (error) {
      console.error("Admin API call failed:", error);
      return null;
    }
  };

  // Scan thumbnail using Vision API
  const scanThumbnail = useCallback(async (thumbnailUrl: string, videoTitle: string): Promise<ThumbnailScanResult> => {
    // Check if paid user - uses Admin API with Vision support
    if (isPaidUser()) {
      // Admin API has Vision support - use gemini (supports vision)
      try {
        const result = await callVisionAPI("gemini", thumbnailUrl, THUMBNAIL_SCAN_PROMPT);
        if (result) {
          const parsed = JSON.parse(result);
          return {
            status: parsed.status,
            issues: parsed.issues || [],
          };
        }
      } catch (error) {
        console.error("Admin Vision API failed:", error);
      }
    }

    // Check if current engine supports Vision
    if (currentEngine && isEngineReady(currentEngine) && supportsVision(currentEngine)) {
      try {
        const result = await callVisionAPI(currentEngine, thumbnailUrl, THUMBNAIL_SCAN_PROMPT);
        if (result) {
          const parsed = JSON.parse(result);
          return {
            status: parsed.status,
            issues: parsed.issues || [],
          };
        }
      } catch (error) {
        console.error("Vision API failed:", error);
      }
    }

    // Try other Vision-supported engines
    for (const engineId of VISION_SUPPORTED_ENGINES) {
      if (engineId !== currentEngine && isEngineReady(engineId)) {
        try {
          const result = await callVisionAPI(engineId, thumbnailUrl, THUMBNAIL_SCAN_PROMPT);
          if (result) {
            const parsed = JSON.parse(result);
            return {
              status: parsed.status,
              issues: parsed.issues || [],
            };
          }
        } catch (error) {
          console.error(`Vision API failed for ${engineId}:`, error);
        }
      }
    }

    // No Vision support available - return unsupported with disclaimer
    return {
      status: "unsupported",
      issues: [],
      disclaimer: VISION_UNSUPPORTED_DISCLAIMER,
    };
  }, [currentEngine, isEngineReady, supportsVision, isPaidUser]);

  // Main scan function with dynamic pricing and confirmation
  const scanVideo = useCallback(async (input: VideoScanInput, skipConfirmation?: boolean): Promise<ScanResult | null> => {
    setIsScanning(true);

    // Calculate dynamic cost based on duration
    const { cost, warning } = calculateScanCost(input.durationSeconds);
    
    // Show warning if duration detection failed
    if (warning) {
      console.warn(warning);
      // In production, show toast notification
    }

    // ALL SCANS ARE FREE - No payment check needed
    // Payment logic removed - scans are completely free for everyone

    // Build platform-specific prompt
    const platformPrompt = SCAN_PROMPTS[input.platformId] || SCAN_PROMPTS.youtube;
    const prompt = platformPrompt
      .replace("{title}", input.title)
      .replace("{description}", input.description)
      .replace("{tags}", input.tags.join(", "));

    let result: string | null = null;
    let engineUsed: EngineId | null = null;

    // System Keys (Coin usage) or Premium Features use Admin API
    if (input.useSystemKeys || isPaidUser()) {
      engineUsed = currentEngine || "gemini";
      result = await callWithAdminAPI(prompt, engineUsed);
    } else {
      // Free users use BYOK with failover
      if (currentEngine && isEngineReady(currentEngine)) {
        result = await callWithBYOK(currentEngine, prompt);
        engineUsed = currentEngine;
      }

      // Failover to next engine if failed
      if (!result) {
        switchToNextEngine();
        const nextEngine = currentEngine;
        if (nextEngine && isEngineReady(nextEngine)) {
          result = await callWithBYOK(nextEngine, prompt);
          engineUsed = nextEngine;
        }
      }
    }

    if (!result) {
      setIsScanning(false);
      throw new Error("All AI engines failed. Please check your API keys.");
    }

    // Parse result
    const aiResult = JSON.parse(result);
    
    // Calculate tokens saved (Loyalty feature)
    // Deep scan would cost $0.50, metadata scan $0.10 in other apps
    const isDeepScan = input.requiresDeepScan;
    const tokensSavedAmount = isDeepScan ? 0.50 : 0.10;
    
    // Convert to new PASS/FAIL format
    const parsedResult: ScanResult = {
      verdict: aiResult.verdict || "FAIL",
      reason: aiResult.reason || "Analysis complete",
      violations: aiResult.violations || aiResult.issues || [],
      passedChecks: aiResult.passedChecks || [],
      recommendations: aiResult.recommendations || aiResult.suggestions || [],
      analyzedAt: new Date().toISOString(),
      engineUsed: engineUsed || "gemini",
      platformId: input.platformId,
      // Video information
      videoTitle: input.title,
      videoUrl: input.videoUrl || `https://${input.platformId}.com/${input.videoId}`,
      videoThumbnail: input.thumbnail,
      tokensSaved: tokensSavedAmount,
    };

    // Scan thumbnail if provided
    if (input.thumbnail) {
      const thumbnailResult = await scanThumbnail(input.thumbnail, input.title);
      parsedResult.thumbnailStatus = thumbnailResult.status;
      parsedResult.thumbnailIssues = thumbnailResult.issues;
      
      // Add thumbnail issues to violations if flagged
      if (thumbnailResult.status === "flagged" && thumbnailResult.issues.length > 0) {
        parsedResult.violations = [...parsedResult.violations, ...thumbnailResult.issues.map(i => `Thumbnail: ${i}`)];
      }
    }

    // Store in database
    if (!isGuest && user) {
      try {
        await supabase.from("video_scans").insert({
          user_id: user.id,
          video_id: input.videoId,
          platform_id: input.platformId,
          title: input.title,
          description: input.description,
          tags: input.tags,
          scan_result: parsedResult,
        });
      } catch (error) {
        console.error("Error saving scan result:", error);
      }
    }

    setLastScanResult(parsedResult);
    setIsScanning(false);
    return parsedResult;
  }, [user, isGuest, currentEngine, isEngineReady, switchToNextEngine, isPaidUser, requiresPayment, canAfford, spendCoins, scanThumbnail]);

  // Get scan history
  const getScanHistory = useCallback(async (): Promise<VideoScanRecord[]> => {
    if (isGuest || !user) return [];

    try {
      const { data, error } = await supabase
        .from("video_scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Properly cast JSON data to VideoScanRecord
      if (!data) return [];
      return data.map(record => ({
        ...record,
        scan_result: record.scan_result as unknown as ScanResult,
      })) as VideoScanRecord[];
    } catch (error) {
      console.error("Error fetching scan history:", error);
      return [];
    }
  }, [user, isGuest]);

  return (
    <VideoScanContext.Provider
      value={{
        scanVideo,
        scanThumbnail,
        getScanHistory,
        isScanning,
        lastScanResult,
        canScanForFree,
        requiresPayment,
        supportsVision,
      }}
    >
      {children}
    </VideoScanContext.Provider>
  );
};

export const useVideoScan = () => {
  const ctx = useContext(VideoScanContext);
  if (!ctx) throw new Error("useVideoScan must be used within VideoScanProvider");
  return ctx;
};
