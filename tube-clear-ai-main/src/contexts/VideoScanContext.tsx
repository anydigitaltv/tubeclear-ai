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
}

export interface ScanResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  issues: string[];
  suggestions: string[];
  analyzedAt: string;
  engineUsed: EngineId;
  thumbnailStatus?: "safe" | "flagged" | "not_scanned" | "unsupported";
  thumbnailIssues?: string[];
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
const VISION_SUPPORTED_ENGINES: EngineId[] = ["gemini", "openai", "claude"];

// Scan prompt for AI analysis
const SCAN_PROMPT = `You are a YouTube/content policy expert. Analyze the following video metadata for potential monetization risks.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO TAGS: {tags}

Analyze for:
1. Policy violations (copyright, community guidelines, advertiser-friendly content)
2. Misleading content or clickbait
3. Sensitive topics that may affect monetization
4. Suggested improvements

Respond in JSON format:
{
  "riskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "issues": ["<issue1>", "<issue2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"]
}`;

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

  // Check if user can scan for free (primary channel)
  const canScanForFree = useCallback((platformId: PlatformId): boolean => {
    return isPrimaryPlatform(platformId);
  }, [isPrimaryPlatform]);

  // Check if scan requires payment
  const requiresPayment = useCallback((platformId: PlatformId): boolean => {
    // If primary platform, free
    if (canScanForFree(platformId)) return false;
    // If paid user (has agency mode), free
    if (isPaidUser()) return false;
    // Otherwise, requires payment
    return true;
  }, [canScanForFree, isPaidUser]);

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
        riskScore: Math.floor(Math.random() * 100),
        riskLevel: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as ScanResult["riskLevel"],
        issues: ["Potential keyword sensitivity detected", "Description could be more detailed"],
        suggestions: ["Consider revising title for clarity", "Add more relevant tags"],
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
  const callWithAdminAPI = async (prompt: string): Promise<string | null> => {
    // In production, this would call your backend with admin API key
    try {
      // Simulate API call
      const response = {
        riskScore: Math.floor(Math.random() * 100),
        riskLevel: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as ScanResult["riskLevel"],
        issues: ["Analysis complete using premium API"],
        suggestions: ["Premium suggestions available"],
      };
      return JSON.stringify(response);
    } catch (error) {
      console.error("Admin API call failed:", error);
      return null;
    }
  };

  // Scan thumbnail using Vision API
  const scanThumbnail = useCallback(async (thumbnailUrl: string, videoTitle: string): Promise<ThumbnailScanResult> => {
    // Check if paid user - uses Admin API with Vision support
    if (isPaidUser()) {
      // Admin API has Vision support
      try {
        const result = await callVisionAPI("openai", thumbnailUrl, THUMBNAIL_SCAN_PROMPT);
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

    // Check if payment required
    if (requiresPayment(input.platformId)) {
      // Check if user can afford scan
      if (!canAfford(cost)) {
        setIsScanning(false);
        throw new Error(`Insufficient coins. You need ${cost} coins for this scan. Please purchase more coins or connect a primary platform.`);
      }
      
      // Confirmation dialog (skip for paid users or if explicitly skipped)
      if (!skipConfirmation && !isPaidUser()) {
        const confirmed = window.confirm(
          `Is scan par ${cost} coins katenge. Agree?\n\nVideo Duration: ${input.durationSeconds ? `${Math.floor(input.durationSeconds / 60)}m ${input.durationSeconds % 60}s` : 'Unknown'}\nScan Cost: ${cost} coins`
        );
        
        if (!confirmed) {
          setIsScanning(false);
          return null;
        }
      }
      
      // Deduct coins
      await spendCoins(cost, "scan_deep", `Dynamic scan (${input.durationSeconds || 0}s) for video: ${input.title}`);
    }

    // Build prompt
    const prompt = SCAN_PROMPT
      .replace("{title}", input.title)
      .replace("{description}", input.description)
      .replace("{tags}", input.tags.join(", "));

    let result: string | null = null;
    let engineUsed: EngineId | null = null;

    // Paid users use Admin API
    if (isPaidUser()) {
      result = await callWithAdminAPI(prompt);
      engineUsed = "openai"; // Admin uses OpenAI
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
    const parsedResult: ScanResult = {
      ...JSON.parse(result),
      analyzedAt: new Date().toISOString(),
      engineUsed: engineUsed || "openai",
    };

    // Scan thumbnail if provided
    if (input.thumbnail) {
      const thumbnailResult = await scanThumbnail(input.thumbnail, input.title);
      parsedResult.thumbnailStatus = thumbnailResult.status;
      parsedResult.thumbnailIssues = thumbnailResult.issues;
      
      // Add thumbnail issues to main issues if flagged
      if (thumbnailResult.status === "flagged" && thumbnailResult.issues.length > 0) {
        parsedResult.issues = [...parsedResult.issues, ...thumbnailResult.issues.map(i => `Thumbnail: ${i}`)];
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
      return (data as VideoScanRecord[]) || [];
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
