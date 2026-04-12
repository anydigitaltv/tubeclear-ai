/**
 * Frame-Level Video Analysis Engine
 * Analyzes video frames and metadata for all platforms
 */

import { CURRENT_YEAR } from './dynamicDate';

// Frame analysis result structure
export interface FrameAnalysisResult {
  frameNumber: number;
  timestamp: number; // Seconds into video
  content: string;
  detectedElements: DetectedElement[];
  violations: PolicyViolation[];
  confidence: number;
}

export interface DetectedElement {
  type: 'text' | 'face' | 'object' | 'logo' | 'qr_code' | 'watermark' | 'adult_content' | 'violence';
  description: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface PolicyViolation {
  policyId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  platformIds: string[];
  recommendedAction: string;
  fixRoadmap?: string[];
  monetizationImpact?: 'full' | 'limited' | 'none';
}

// Platform-specific frame analysis requirements
export const getPlatformFrameRequirements = (platformId: string): FrameAnalysisConfig => {
  const configs: Record<string, FrameAnalysisConfig> = {
    youtube: {
      frameRate: 1, // Analyze every 1 second
      requiresTextOCR: true,
      requiresFaceDetection: true,
      requiresLogoDetection: true,
      requiresQRCodeDetection: true,
      checks: [
        'copyright_watermarks',
        'ai_disclosure_labels',
        'branded_content_badges',
        'kids_safety_content',
        'adult_content',
        'violence_graphic',
        'reused_content',
        'ad_suitability_check',
        'misleading_metadata'
      ]
    },
    tiktok: {
      frameRate: 2, // Analyze every 0.5 seconds (faster content)
      requiresTextOCR: true,
      requiresFaceDetection: true,
      requiresLogoDetection: false,
      requiresQRCodeDetection: true, // Critical for TikTok
      checks: [
        'ai_generated_label',
        'qr_code_violation',
        'community_guidelines',
        'branded_content_toggle',
        'dangerous_acts',
        'unoriginal_content_detection',
        'ai_generated_disclosure',
        'engagement_bait'
      ]
    },
    instagram: {
      frameRate: 1,
      requiresTextOCR: true,
      requiresFaceDetection: true,
      requiresLogoDetection: true,
      requiresQRCodeDetection: false,
      checks: [
        'branded_content_tag',
        'reels_monetization',
        'community_guidelines',
        'copyright_music',
        'misinformation'
      ]
    },
    facebook: {
      frameRate: 1,
      requiresTextOCR: true,
      requiresFaceDetection: true,
      requiresLogoDetection: true,
      requiresQRCodeDetection: false,
      checks: [
        'branded_content_tool',
        'reels_play_bonus',
        'partner_monetization',
        'hate_speech',
        'harassment'
      ]
    },
    dailymotion: {
      frameRate: 1,
      requiresTextOCR: true,
      requiresFaceDetection: false,
      requiresLogoDetection: true,
      requiresQRCodeDetection: false,
      checks: [
        'partner_program',
        'quality_standards',
        'copyright_compliance',
        'ad_suitability'
      ]
    }
  };
  
  return configs[platformId] || configs.youtube;
};

export interface FrameAnalysisConfig {
  frameRate: number; // Frames per second to analyze
  requiresTextOCR: boolean;
  requiresFaceDetection: boolean;
  requiresLogoDetection: boolean;
  requiresQRCodeDetection: boolean;
  checks: string[];
}

// Generate AI prompt for frame analysis
export const generateFrameAnalysisPrompt = (
  platformId: string,
  frameData: string,
  timestamp: number,
  isLowRes: boolean = true
): string => {
  const config = getPlatformFrameRequirements(platformId);
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  };
  
  return `Act as a senior ${platformId.toUpperCase()} Compliance Auditor. Analyze this ${isLowRes ? '360p optimized' : 'high-res'} video frame at ${formatTime(timestamp)}.
  
FRAME DATA: ${frameData}

REQUIRED CHECKS (per ${CURRENT_YEAR} ${platformId.toUpperCase()} Internal Review Standards):
${config.checks.map(check => `- ${check}`).join('\n')}

DETECTION REQUIREMENTS:
- Text OCR: ${config.requiresTextOCR ? 'REQUIRED' : 'Optional'}
- Face Detection: ${config.requiresFaceDetection ? 'REQUIRED' : 'Optional'}
- Logo Detection: ${config.requiresLogoDetection ? 'REQUIRED' : 'Optional'}
- QR Code Detection: ${config.requiresQRCodeDetection ? 'CRITICAL' : 'Optional'}

IDENTIFY:
1. Any visible text overlays or labels
2. Branded content indicators
3. AI-generated content markers
4. Copyright watermarks or logos
5. QR codes or external links
6. Policy-violating imagery
7. Engagement bait or artificial engagement signals

For each violation found:
- Specify exact timestamp: ${formatTime(timestamp)}
- Cite specific ${platformId} policy
- Rate severity (low/medium/high/critical)
- Recommend fix action
- Provide a step-by-step FIX ROADMAP (Actionable steps)
- Determine Monetization Verdict: (Green: Full / Yellow: Limited / Red: Blocked)

Return structured JSON with detected elements and violations.`;
};

// Calculate memory cache key for frame data
export const generateFrameCacheKey = (
  videoId: string,
  platformId: string,
  frameNumber: number
): string => {
  return `frame_${videoId}_${platformId}_f${frameNumber}`;
};

// Check if cached frame data is still valid
export const isFrameCacheValid = (cacheTimestamp: string): boolean => {
  const cacheDate = new Date(cacheTimestamp);
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return cacheDate > twentyFourHoursAgo;
};

// Merge old cached data with new live policy checks
export const mergeFrameDataWithLivePolicies = (
  cachedFrames: FrameAnalysisResult[],
  livePolicyResults: PolicyViolation[]
): FrameAnalysisResult[] => {
  // Add new policy violations to existing frames
  return cachedFrames.map(frame => ({
    ...frame,
    violations: [
      ...frame.violations,
      ...livePolicyResults.filter(violation => {
        // Match violations to relevant frames based on timestamp proximity
        const violationTimestamp = parseFloat(violation.policyId.split('_')[1] || '0');
        return Math.abs(violationTimestamp - frame.timestamp) < 5;
      })
    ]
  }));
};

// Extract timestamp from frame number
export const frameNumberToTimestamp = (frameNumber: number, frameRate: number): number => {
  return frameNumber / frameRate;
};

// Format timestamp as MM:SS
export const formatTimestampMMSS = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Validate frame analysis completeness
export const validateFrameAnalysis = (
  frames: FrameAnalysisResult[],
  videoDurationSeconds: number,
  frameRate: number
): FrameValidationResult => {
  const expectedFrames = Math.floor(videoDurationSeconds * frameRate);
  const actualFrames = frames.length;
  const coveragePercentage = (actualFrames / expectedFrames) * 100;
  
  const gaps: { start: number; end: number }[] = [];
  let lastTimestamp = 0;
  
  frames.sort((a, b) => a.timestamp - b.timestamp).forEach(frame => {
    if (frame.timestamp - lastTimestamp > (1 / frameRate) * 2) {
      gaps.push({
        start: lastTimestamp,
        end: frame.timestamp
      });
    }
    lastTimestamp = frame.timestamp;
  });
  
  return {
    isValid: coveragePercentage >= 90 && gaps.length === 0,
    coveragePercentage,
    expectedFrames,
    actualFrames,
    gaps,
    warnings: []
  };
};

export interface FrameValidationResult {
  isValid: boolean;
  coveragePercentage: number;
  expectedFrames: number;
  actualFrames: number;
  gaps: { start: number; end: number }[];
  warnings: string[];
}

// Platform-specific violation thresholds
export const getPlatformViolationThresholds = (platformId: string): ViolationThresholds => {
  const thresholds: Record<string, ViolationThresholds> = {
    youtube: {
      critical: 0, // Zero tolerance
      high: 1,     // Auto-flag
      medium: 3,   // Warning
      low: 5       // Advisory
    },
    tiktok: {
      critical: 0,
      high: 2,
      medium: 4,
      low: 6
    },
    instagram: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 5
    },
    facebook: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 5
    },
    dailymotion: {
      critical: 0,
      high: 2,
      medium: 4,
      low: 6
    }
  };
  
  return thresholds[platformId] || thresholds.youtube;
};

export interface ViolationThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}
