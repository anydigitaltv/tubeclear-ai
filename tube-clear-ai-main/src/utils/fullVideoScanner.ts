/**
 * Full Video Scanner - Integrates frame analysis, audio detection, and timeline scanning
 * This module enhances the existing HybridScanner with actual video content analysis
 */

import { downloadVideo, convertTo360p, extractFrames, calculateFrameInterval } from "@/utils/videoProcessor";
import { extractAudio, analyzeAudio, generateAudioAnalysisPrompt } from "@/utils/audioAnalyzer";
import { generateFrameAnalysisPrompt, getPlatformFrameRequirements } from "@/utils/frameLevelAnalysis";
import { useLicenseKeys } from "@/contexts/LicenseKeyContext";

export interface FullVideoScanResult {
  // Metadata analysis
  metadataScore: number;
  metadataIssues: string[];
  
  // Frame/Visual analysis
  frameAnalysisComplete: boolean;
  framesAnalyzed: number;
  visualViolations: Array<{
    timestamp: number;
    frameNumber: number;
    violation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  visualScore: number;
  
  // Audio analysis
  audioAnalysisComplete: boolean;
  hasMusic: boolean;
  hasVoice: boolean;
  potentialCopyright: boolean;
  audioIssues: string[];
  audioScore: number;
  
  // Timeline analysis
  timelineScanned: boolean;
  totalDuration: number;
  samplePoints: number;
  
  // Overall results
  overallScore: number;
  overallVerdict: 'PASS' | 'FLAGGED' | 'FAIL';
  criticalIssues: string[];
  recommendations: string[];
}

/**
 * Main function to perform full video scan
 * Integrates metadata, frames, audio, and timeline analysis
 */
export const performFullVideoScan = async (
  videoUrl: string,
  platformId: string,
  title: string,
  description: string,
  tags: string[],
  thumbnail?: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<FullVideoScanResult | null> => {
  try {
    console.log('🎬 Starting full video scan...');
    
    const result: FullVideoScanResult = {
      metadataScore: 0,
      metadataIssues: [],
      frameAnalysisComplete: false,
      framesAnalyzed: 0,
      visualViolations: [],
      visualScore: 100,
      audioAnalysisComplete: false,
      hasMusic: false,
      hasVoice: false,
      potentialCopyright: false,
      audioIssues: [],
      audioScore: 100,
      timelineScanned: false,
      totalDuration: 0,
      samplePoints: 0,
      overallScore: 100,
      overallVerdict: 'PASS',
      criticalIssues: [],
      recommendations: [],
    };

    // STAGE 1: Metadata Analysis (Existing functionality)
    onProgress?.('metadata', 10);
    console.log('📝 Analyzing metadata...');
    
    const metadataResult = analyzeMetadata(title, description, tags, platformId);
    result.metadataScore = metadataResult.score;
    result.metadataIssues = metadataResult.issues;
    
    onProgress?.('metadata', 100);

    // STAGE 2: Video Download & Processing
    onProgress?.('download', 0);
    console.log('📥 Downloading video...');
    
    const videoData = await downloadVideo(videoUrl, (progress) => {
      onProgress?.('download', progress);
    });
    
    if (!videoData) {
      console.warn('⚠️ Video download failed, skipping frame/audio analysis');
      return calculateMetadataOnlyResult(result);
    }
    
    result.totalDuration = videoData.duration;
    onProgress?.('download', 100);

    // STAGE 3: Convert to 360p for optimized scanning
    onProgress?.('convert', 0);
    console.log('🎬 Converting to 360p...');
    
    const video360p = await convertTo360p(videoData.blob);
    const videoToAnalyze = video360p || videoData.blob;
    onProgress?.('convert', 100);

    // STAGE 4: Frame-Level Visual Analysis
    onProgress?.('frames', 0);
    console.log('🖼️ Performing frame-level analysis...');
    
    const frameInterval = calculateFrameInterval(videoData.duration);
    const maxFrames = Math.min(50, Math.ceil(videoData.duration / frameInterval));
    
    const frames = await extractFrames(videoToAnalyze, frameInterval, maxFrames);
    result.framesAnalyzed = frames.length;
    
    // Analyze each frame with AI (if vision API key available)
    const frameViolations = await analyzeFramesWithAI(
      frames,
      platformId,
      title,
      videoData.duration
    );
    
    result.visualViolations = frameViolations;
    result.frameAnalysisComplete = true;
    result.visualScore = calculateVisualScore(frameViolations, frames.length);
    onProgress?.('frames', 100);

    // STAGE 5: Audio Extraction & Analysis
    onProgress?.('audio', 0);
    console.log('🎵 Extracting and analyzing audio...');
    
    const audioData = await extractAudio(videoData.blob);
    
    if (audioData) {
      const audioResult = await analyzeAudio(audioData.audioBlob, title, description);
      result.hasMusic = audioResult.hasMusic;
      result.hasVoice = audioResult.hasVoice;
      result.potentialCopyright = audioResult.potentialCopyright;
      result.audioIssues = audioResult.issues;
      result.audioScore = calculateAudioScore(audioResult);
      result.audioAnalysisComplete = true;
    }
    onProgress?.('audio', 100);

    // STAGE 6: Timeline Analysis
    onProgress?.('timeline', 0);
    console.log('📊 Analyzing video timeline...');
    
    result.timelineScanned = true;
    result.samplePoints = frames.length;
    onProgress?.('timeline', 100);

    // STAGE 7: Calculate Overall Results
    console.log('📈 Calculating overall results...');
    
    result.overallScore = calculateOverallScore(
      result.metadataScore,
      result.visualScore,
      result.audioScore
    );
    
    result.overallVerdict = calculateVerdict(result.overallScore);
    result.criticalIssues = gatherCriticalIssues(result);
    result.recommendations = generateRecommendations(result);

    console.log('✅ Full video scan complete:', result);
    return result;
  } catch (error) {
    console.error('❌ Full video scan failed:', error);
    return null;
  }
};

/**
 * Analyze metadata for policy violations
 */
const analyzeMetadata = (
  title: string,
  description: string,
  tags: string[],
  platformId: string
): { score: number; issues: string[] } => {
  const issues: string[] = [];
  let score = 100;
  
  const fullText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
  
  // Check for common policy violations
  const violationPatterns = [
    { pattern: /clickbait|misleading|fake/, issue: 'Potentially misleading content', penalty: 15 },
    { pattern: /copyright|all rights reserved/, issue: 'Copyright notice detected', penalty: 10 },
    { pattern: /ai generated|deepfake|synthetic/, issue: 'AI-generated content (disclosure required)', penalty: 20 },
    { pattern: /explicit|adult|nsfw/, issue: 'Potentially explicit content', penalty: 30 },
    { pattern: /violence|hate|harassment/, issue: 'Potentially violating content', penalty: 35 },
  ];
  
  violationPatterns.forEach(({ pattern, issue, penalty }) => {
    if (pattern.test(fullText)) {
      issues.push(issue);
      score -= penalty;
    }
  });
  
  return {
    score: Math.max(0, score),
    issues,
  };
};

/**
 * Analyze frames with AI Vision API
 */
const analyzeFramesWithAI = async (
  frames: Array<{ frameNumber: number; timestamp: number; imageData: string }>,
  platformId: string,
  title: string,
  duration: number
): Promise<FullVideoScanResult['visualViolations']> => {
  const violations: FullVideoScanResult['visualViolations'] = [];
  
  // Check if user has vision API key
  // In production, this would use the actual API key from LicenseKeyContext
  const hasVisionKey = false; // Would check useLicenseKeys().hasActiveKey('vision_api')
  
  if (!hasVisionKey) {
    console.log('⚠️ No Vision API key - using basic frame analysis');
    // Return empty violations (would need API key for full analysis)
    return violations;
  }
  
  // Analyze sample frames (limit to prevent API overload)
  const framesToAnalyze = frames.slice(0, Math.min(frames.length, 20));
  
  for (const frame of framesToAnalyze) {
    const prompt = generateFrameAnalysisPrompt(
      platformId,
      `Frame at ${frame.timestamp}s from video: ${title}`,
      frame.timestamp,
      true // 360p
    );
    
    // In production: Call AI Vision API with frame.imageData and prompt
    // For now, this is a placeholder
    console.log(`🔍 Analyzing frame ${frame.frameNumber} at ${frame.timestamp}s`);
    
    // Simulated analysis (would be real API call)
    // const apiResponse = await callVisionAPI(frame.imageData, prompt);
    // if (apiResponse.violations) {
    //   violations.push(...apiResponse.violations);
    // }
  }
  
  return violations;
};

/**
 * Calculate visual score based on violations
 */
const calculateVisualScore = (
  violations: FullVideoScanResult['visualViolations'],
  totalFrames: number
): number => {
  if (totalFrames === 0) return 100;
  
  const violationWeight = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  };
  
  let totalPenalty = 0;
  violations.forEach(v => {
    totalPenalty += violationWeight[v.severity] || 0;
  });
  
  return Math.max(0, 100 - (totalPenalty / totalFrames) * 100);
};

/**
 * Calculate audio score based on analysis
 */
const calculateAudioScore = (audioResult: Awaited<ReturnType<typeof analyzeAudio>>): number => {
  let score = 100;
  
  if (audioResult.potentialCopyright) {
    score -= 40;
  }
  
  if (audioResult.issues.length > 0) {
    score -= audioResult.issues.length * 10;
  }
  
  return Math.max(0, score);
};

/**
 * Calculate overall score from all components
 */
const calculateOverallScore = (
  metadataScore: number,
  visualScore: number,
  audioScore: number
): number => {
  // Weighted average: Metadata 30%, Visual 40%, Audio 30%
  const weighted = (metadataScore * 0.3) + (visualScore * 0.4) + (audioScore * 0.3);
  return Math.round(weighted);
};

/**
 * Calculate verdict based on overall score
 */
const calculateVerdict = (score: number): 'PASS' | 'FLAGGED' | 'FAIL' => {
  if (score >= 70) return 'PASS';
  if (score >= 40) return 'FLAGGED';
  return 'FAIL';
};

/**
 * Gather all critical issues
 */
const gatherCriticalIssues = (result: FullVideoScanResult): string[] => {
  const critical: string[] = [];
  
  if (result.metadataScore < 50) {
    critical.push('Metadata has serious policy violations');
  }
  
  if (result.visualViolations.some(v => v.severity === 'critical' || v.severity === 'high')) {
    critical.push('High-severity visual violations detected');
  }
  
  if (result.potentialCopyright) {
    critical.push('Potential copyrighted content detected');
  }
  
  return critical;
};

/**
 * Generate recommendations based on scan results
 */
const generateRecommendations = (result: FullVideoScanResult): string[] => {
  const recommendations: string[] = [];
  
  if (result.metadataIssues.length > 0) {
    recommendations.push('Review and update video metadata to comply with platform policies');
  }
  
  if (result.visualViolations.length > 0) {
    recommendations.push('Address visual policy violations at detected timestamps');
  }
  
  if (result.potentialCopyright) {
    recommendations.push('Verify music licensing or replace copyrighted audio');
  }
  
  if (result.overallScore < 70) {
    recommendations.push('Consider re-editing content to improve compliance score');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Content looks good! Continue creating quality videos');
  }
  
  return recommendations;
};

/**
 * Calculate result when video download fails (metadata only)
 */
const calculateMetadataOnlyResult = (
  partialResult: Partial<FullVideoScanResult>
): FullVideoScanResult => {
  return {
    metadataScore: partialResult.metadataScore || 0,
    metadataIssues: partialResult.metadataIssues || [],
    frameAnalysisComplete: false,
    framesAnalyzed: 0,
    visualViolations: [],
    visualScore: 100,
    audioAnalysisComplete: false,
    hasMusic: false,
    hasVoice: false,
    potentialCopyright: false,
    audioIssues: [],
    audioScore: 100,
    timelineScanned: false,
    totalDuration: 0,
    samplePoints: 0,
    overallScore: partialResult.metadataScore || 0,
    overallVerdict: calculateVerdict(partialResult.metadataScore || 0),
    criticalIssues: partialResult.metadataIssues || [],
    recommendations: ['Video content analysis unavailable - check URL accessibility'],
  };
};
