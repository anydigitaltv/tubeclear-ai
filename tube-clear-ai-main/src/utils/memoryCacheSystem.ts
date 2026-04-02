/**
 * Memory Cache & Live Policy Overlay System
 * Optimizes scans by reusing cached data + overlaying new live policy checks
 */

import { FrameAnalysisResult, generateFrameCacheKey, isFrameCacheValid } from './frameLevelAnalysis';

// Cached scan result structure
export interface CachedScanResult {
  videoId: string;
  platformId: string;
  timestamp: string;
  frameResults: FrameAnalysisResult[];
  metadataAnalysis: MetadataAnalysis;
  policyVersion: string;
  isValid: boolean;
}

export interface MetadataAnalysis {
  title: string;
  description: string;
  tags: string[];
  thumbnail: string;
  duration: number;
  aiDetected: boolean;
  disclosureStatus: string;
}

// Memory cache manager
export class MemoryCacheManager {
  private static instance: MemoryCacheManager;
  private cache: Map<string, CachedScanResult>;
  private maxCacheSize: number = 100; // LRU cache limit
  
  private constructor() {
    this.cache = new Map();
  }
  
  public static getInstance(): MemoryCacheManager {
    if (!MemoryCacheManager.instance) {
      MemoryCacheManager.instance = new MemoryCacheManager();
    }
    return MemoryCacheManager.instance;
  }
  
  // Check if cached data exists and is valid
  public getCachedScan(videoId: string, platformId: string): CachedScanResult | null {
    const cacheKey = `scan_${videoId}_${platformId}`;
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Validate cache (24-hour expiry)
    if (!isFrameCacheValid(cached.timestamp)) {
      this.removeCache(cacheKey);
      return null;
    }
    
    console.log(`✅ Cache hit for ${videoId} (${platformId})`);
    return cached;
  }
  
  // Store new scan result in cache
  public setCachedScan(
    videoId: string,
    platformId: string,
    frameResults: FrameAnalysisResult[],
    metadataAnalysis: MetadataAnalysis,
    policyVersion: string
  ): void {
    const cacheKey = `scan_${videoId}_${platformId}`;
    
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.removeCache(oldestKey);
      }
    }
    
    this.cache.set(cacheKey, {
      videoId,
      platformId,
      timestamp: new Date().toISOString(),
      frameResults,
      metadataAnalysis,
      policyVersion,
      isValid: true
    });
    
    console.log(`💾 Cached scan for ${videoId} (${platformId})`);
  }
  
  // Remove specific cache entry
  public removeCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
    console.log(`🗑️ Removed cache: ${cacheKey}`);
  }
  
  // Clear all caches
  public clearAllCache(): void {
    this.cache.clear();
    console.log('🧹 All caches cleared');
  }
  
  // Get cache statistics
  public getStats(): CacheStats {
    return {
      totalEntries: this.cache.size,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.cache.size / this.maxCacheSize) * 100
    };
  }
}

export interface CacheStats {
  totalEntries: number;
  maxSize: number;
  utilizationPercent: number;
}

// Live policy overlay engine
export class LivePolicyOverlay {
  // Merge cached frames with new live policy violations
  public static mergeWithLivePolicies(
    cachedFrames: FrameAnalysisResult[],
    newViolations: Array<{
      timestamp: number;
      policyId: string;
      severity: string;
      description: string;
    }>
  ): FrameAnalysisResult[] {
    // Create a map of violations by timestamp
    const violationsByTimestamp = new Map<number, typeof newViolations>();
    
    newViolations.forEach(violation => {
      const existing = violationsByTimestamp.get(violation.timestamp) || [];
      existing.push(violation);
      violationsByTimestamp.set(violation.timestamp, existing);
    });
    
    // Merge into cached frames
    return cachedFrames.map(frame => {
      const matchingViolations = violationsByTimestamp.get(frame.timestamp) || [];
      
      return {
        ...frame,
        violations: [
          ...frame.violations,
          ...matchingViolations.map(v => ({
            policyId: v.policyId,
            severity: v.severity as 'low' | 'medium' | 'high' | 'critical',
            description: v.description,
            platformIds: [],
            recommendedAction: 'Review and fix'
          }))
        ]
      };
    });
  }
  
  // Identify which cached frames need re-scanning with new policies
  public static identifyFramesForRescan(
    cachedFrames: FrameAnalysisResult[],
    newPolicyKeywords: string[]
  ): number[] {
    const framesNeedingRescan: number[] = [];
    
    cachedFrames.forEach((frame, index) => {
      const frameText = frame.content.toLowerCase();
      const needsRescan = newPolicyKeywords.some(keyword => 
        frameText.includes(keyword.toLowerCase())
      );
      
      if (needsRescan) {
        framesNeedingRescan.push(index);
      }
    });
    
    return framesNeedingRescan;
  }
  
  // Calculate time saved by using cache
  public static calculateTimeSaved(
    totalFrames: number,
    cachedFrames: number,
    avgFrameProcessingMs: number = 500
  ): TimeSavings {
    const framesSkipped = cachedFrames;
    const timeSavedMs = framesSkipped * avgFrameProcessingMs;
    const timeSavedSeconds = timeSavedMs / 1000;
    const efficiencyPercent = (framesSkipped / totalFrames) * 100;
    
    return {
      framesSkipped,
      timeSavedMs,
      timeSavedSeconds,
      efficiencyPercent
    };
  }
}

export interface TimeSavings {
  framesSkipped: number;
  timeSavedMs: number;
  timeSavedSeconds: number;
  efficiencyPercent: number;
}

// LocalStorage wrapper for persistent cache
export const PersistentCache = {
  STORAGE_KEY: 'tubeclear_frame_cache',
  
  saveToPersistentCache(data: CachedScanResult): void {
    try {
      const existing = this.getAllFromPersistentCache();
      existing.push(data);
      
      // Keep only last 50 entries to prevent storage bloat
      const trimmed = existing.slice(-50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save to persistent cache:', error);
    }
  },
  
  getFromPersistentCache(videoId: string, platformId: string): CachedScanResult | null {
    try {
      const all = this.getAllFromPersistentCache();
      const found = all.find(
        item => item.videoId === videoId && item.platformId === platformId
      );
      
      if (!found) {
        return null;
      }
      
      // Validate freshness
      if (!isFrameCacheValid(found.timestamp)) {
        this.removeFromPersistentCache(videoId, platformId);
        return null;
      }
      
      return found;
    } catch (error) {
      console.error('Failed to get from persistent cache:', error);
      return null;
    }
  },
  
  getAllFromPersistentCache(): CachedScanResult[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load persistent cache:', error);
      return [];
    }
  },
  
  removeFromPersistentCache(videoId: string, platformId: string): void {
    try {
      const all = this.getAllFromPersistentCache();
      const filtered = all.filter(
        item => !(item.videoId === videoId && item.platformId === platformId)
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from persistent cache:', error);
    }
  },
  
  clearPersistentCache(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 Persistent cache cleared');
  }
};

// Scan optimization workflow
export const optimizeScanWorkflow = async (
  videoId: string,
  platformId: string,
  performFullScan: () => Promise<CachedScanResult>,
  performLivePolicyCheck: () => Promise<Array<{
    timestamp: number;
    policyId: string;
    severity: string;
    description: string;
  }>>
): Promise<{
  result: CachedScanResult;
  wasCached: boolean;
  timeSaved?: TimeSavings;
}> => {
  const cacheManager = MemoryCacheManager.getInstance();
  
  // STEP 1: Check memory cache first
  const cached = cacheManager.getCachedScan(videoId, platformId);
  
  if (cached) {
    console.log('♻️ Using cached frame analysis...');
    
    // STEP 2: Run live policy checks only (much faster)
    console.log('🔍 Running live policy overlay...');
    const newViolations = await performLivePolicyCheck();
    
    // STEP 3: Merge cached frames with new violations
    const mergedFrames = LivePolicyOverlay.mergeWithLivePolicies(
      cached.frameResults,
      newViolations
    );
    
    // STEP 4: Calculate time savings
    const timeSaved = LivePolicyOverlay.calculateTimeSaved(
      cached.frameResults.length,
      cached.frameResults.length
    );
    
    console.log(`⚡ Saved ${timeSaved.timeSavedSeconds.toFixed(1)}s by using cache!`);
    
    return {
      result: {
        ...cached,
        frameResults: mergedFrames
      },
      wasCached: true,
      timeSaved
    };
  }
  
  // STEP 5: No cache - perform full scan
  console.log('🆕 Performing full frame-level scan...');
  const fullResult = await performFullScan();
  
  // STEP 6: Cache the result
  cacheManager.setCachedScan(
    videoId,
    platformId,
    fullResult.frameResults,
    fullResult.metadataAnalysis,
    fullResult.policyVersion
  );
  
  // STEP 7: Also save to persistent storage
  PersistentCache.saveToPersistentCache(fullResult);
  
  return {
    result: fullResult,
    wasCached: false,
    timeSaved: undefined
  };
};
