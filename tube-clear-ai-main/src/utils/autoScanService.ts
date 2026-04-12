import type { ChannelVideo } from "@/utils/channelVideoFetcher";
import { usePolicyWatcher } from "@/contexts/PolicyWatcherContext";
import type { PlatformId } from "@/contexts/PlatformContext";

export interface ScanResult {
  riskScore: number;
  verdict: "PASS" | "FLAGGED" | "FAIL";
  issues: string[];
  scannedAt: string;
  scanType: "pre-scan" | "deep-scan";
  // Detailed report data for PDFs and Dashboard
  videoTitle?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  monetizationVerdict?: "GREEN" | "YELLOW" | "RED";
  fixRoadmap?: string[];
}

// Policy keywords for pattern matching (simplified version)
const POLICY_KEYWORDS: Record<PlatformId, string[]> = {
  youtube: [
    "clickbait", "fake", "scam", "misleading", "spam",
    "hate speech", "violence", "dangerous", "harassment",
    "copyright", "stolen", "reuploaded"
  ],
  tiktok: [
    "dangerous challenge", "harmful", "bullying", "fake news",
    "inappropriate", "violence", "hate", "spam"
  ],
  instagram: [
    "fake giveaway", "scam", "spam", "inappropriate",
    "copyright violation", "hate speech", "bullying"
  ],
  facebook: [
    "fake news", "misleading", "scam", "spam",
    "hate speech", "violence", "harassment", "false information"
  ],
  dailymotion: [
    "copyright", "inappropriate", "spam", "misleading",
    "violence", "hate speech", "fake content"
  ],
};

/**
 * Lightweight pre-scan for batch processing
 * Uses pattern matching only (no AI API calls)
 */
export const autoScanVideo = async (video: ChannelVideo): Promise<ScanResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  
  const keywords = POLICY_KEYWORDS[video.platformId] || [];
  const titleLower = video.title.toLowerCase();
  
  // Check for policy violations
  const issues: string[] = [];
  let riskScore = 0;
  
  for (const keyword of keywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      issues.push(`Potential policy violation: "${keyword}" detected`);
      riskScore += 15;
    }
  }
  
  // Add some randomness for realistic distribution
  riskScore += Math.floor(Math.random() * 20) - 5;
  
  // Cap risk score
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  // Determine verdict
  let verdict: "PASS" | "FLAGGED" | "FAIL";
  if (riskScore < 30) {
    verdict = "PASS";
  } else if (riskScore < 70) {
    verdict = "FLAGGED";
  } else {
    verdict = "FAIL";
  }
  
  // If no issues found, add a positive note
  if (issues.length === 0) {
    issues.push("No obvious policy violations detected");
  }
  
  return {
    riskScore,
    verdict,
    issues,
    scannedAt: new Date().toISOString(),
    scanType: "pre-scan",
    videoTitle: video.title,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnail,
    // Pre-scan verdict based on keyword risk
    monetizationVerdict: riskScore < 30 ? "GREEN" : riskScore < 70 ? "YELLOW" : "RED",
    fixRoadmap: issues.length > 0 
      ? [
          "Title aur tags mein se policy violations (keywords) ko remove karein.",
          "Description ko advertiser-friendly banayein taake monetization on ho saky."
        ] 
      : ["Shabash! Aapka content monetization ke liye bilkul safe hai."]
  };
};

/**
 * Batch scan multiple videos
 */
export const batchScanVideos = async (videos: ChannelVideo[]): Promise<Map<string, ScanResult>> => {
  const results = new Map<string, ScanResult>();
  
  for (const video of videos) {
    const result = await autoScanVideo(video);
    results.set(video.videoId, result);
  }
  
  return results;
};
