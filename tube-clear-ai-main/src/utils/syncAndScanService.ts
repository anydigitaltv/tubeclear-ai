import type { PlatformId } from "@/contexts/PlatformContext";
import type { ChannelVideo } from "@/utils/channelVideoFetcher";
import type { ScanResult } from "@/utils/autoScanService";
import { autoScanVideo } from "@/utils/autoScanService";
import { 
  saveVideosToDatabase, 
  saveVideosToLocalStorage,
  updateVideoScanResult,
  updateVideoScanResultInLocalStorage
} from "@/utils/channelVideoStorage";

export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';

export interface FormattedVideo {
  id: string;
  platform: PlatformId;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  scanStatus: ScanStatus;
  riskScore?: number;
  scanResult?: ScanResult;
  durationSeconds?: number;
  views?: number;
  publishedAt?: string;
}

/**
 * Platform-specific URL generators for all supported platforms
 */
export const generatePlatformVideoUrl = (platform: PlatformId, videoId: string, channelUrl?: string): string => {
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${videoId}`;
    
    case 'tiktok': {
      const username = channelUrl ? extractUsername(channelUrl) : 'user';
      return `https://www.tiktok.com/@${username}/video/${videoId}`;
    }
    
    case 'instagram':
      return `https://www.instagram.com/reel/${videoId}`;
    
    case 'facebook':
      return `https://www.facebook.com/watch/?v=${videoId}`;
    
    case 'dailymotion':
      return `https://www.dailymotion.com/video/${videoId}`;
    
    default:
      return `https://example.com/video/${videoId}`;
  }
};

/**
 * Extract username from channel URL
 */
const extractUsername = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    for (const part of pathParts) {
      if (!['watch', 'video', 'reel', 'videos', 'page'].includes(part)) {
        return part.replace('@', '');
      }
    }
    return pathParts[0] || 'user';
  } catch {
    return url.split('/').pop()?.replace('@', '') || 'user';
  }
};

/**
 * Format raw platform video data into standardized format
 */
export const formatVideoData = (
  platform: PlatformId,
  video: any,
  channelUrl?: string
): FormattedVideo => {
  // Handle different platform data structures
  const title = video.title || video.snippet?.title || 'Untitled Video';
  const thumbnailUrl = video.thumbnail || video.thumbnailUrl || video.snippet?.thumbnails?.high?.url || '';
  const videoId = video.videoId || video.id || video.video_id || '';
  const videoUrl = video.videoUrl || video.url || video.snippet?.resourceId?.videoId 
    ? generatePlatformVideoUrl(platform, video.snippet.resourceId.videoId, channelUrl)
    : generatePlatformVideoUrl(platform, videoId, channelUrl);
  
  return {
    id: videoId,
    platform,
    title,
    thumbnailUrl,
    videoUrl,
    scanStatus: 'pending',
    durationSeconds: video.durationSeconds || video.contentDetails?.duration 
      ? parseDuration(video.contentDetails.duration) 
      : undefined,
    views: video.views || video.statistics?.viewCount || 0,
    publishedAt: video.publishedAt || video.snippet?.publishedAt,
  };
};

/**
 * Parse ISO 8601 duration to seconds
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Main sync and scan function
 * Fetches videos, saves to database, and auto-triggers hybrid scan
 */
export const syncAndScanPlatformVideos = async (
  platform: PlatformId,
  channelUrl: string,
  fetchedVideos: ChannelVideo[],
  userId?: string,
  isGuest: boolean = false,
  onStatusUpdate?: (videoId: string, status: ScanStatus, result?: ScanResult) => void
): Promise<boolean> => {
  try {
    console.log(`🔄 Starting sync and scan for ${platform}...`);
    
    // Step 1: Format videos with proper platform-specific URLs
    const formattedVideos = fetchedVideos.map(video => 
      formatVideoData(platform, video, channelUrl)
    );
    
    console.log(`✅ Formatted ${formattedVideos.length} videos with platform-specific URLs`);
    
    // Step 2: Add scan data to formatted videos
    const videosWithScanData = fetchedVideos.map((originalVideo, index) => {
      const formatted = formattedVideos[index];
      
      return {
        ...originalVideo,
        videoId: formatted.id,
        platformId: platform,
        title: formatted.title,
        thumbnail: formatted.thumbnailUrl,
        videoUrl: formatted.videoUrl,
      } as ChannelVideo & { riskScore?: number; scanResult?: ScanResult };
    });
    
    // Step 3: Save to database (Supabase or localStorage)
    if (!isGuest && userId) {
      await saveVideosToDatabase(videosWithScanData, userId);
      console.log(`✅ Saved ${videosWithScanData.length} videos to Supabase`);
    } else {
      saveVideosToLocalStorage(videosWithScanData);
      console.log(`✅ Saved ${videosWithScanData.length} videos to localStorage`);
    }
    
    // Step 4: AUTO-SCAN TRIGGER - Process each video
    console.log(`🤖 Starting auto-scan for ${formattedVideos.length} videos...`);
    
    for (const video of videosWithScanData) {
      try {
        // Update UI to 'scanning'
        if (onStatusUpdate) {
          onStatusUpdate(video.videoId, 'scanning');
        }
        
        // Call auto-scan (pattern matching pre-scan)
        const scanResult = await autoScanVideo(video);
        
        // Update video with scan result
        video.riskScore = scanResult.riskScore;
        video.scanResult = scanResult;
        
        // Update database with scan result
        if (!isGuest && userId) {
          await updateVideoScanResult(userId, video.videoId, platform, scanResult);
        } else {
          updateVideoScanResultInLocalStorage(video.videoId, scanResult);
        }
        
        // Update UI to 'completed'
        if (onStatusUpdate) {
          onStatusUpdate(video.videoId, 'completed', scanResult);
        }
        
        console.log(`✅ Scanned: ${video.title} - Risk: ${scanResult.riskScore}%`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Auto-scan failed for ${video.videoId}:`, error);
        
        // Update UI to 'failed'
        if (onStatusUpdate) {
          onStatusUpdate(video.videoId, 'failed');
        }
      }
    }
    
    console.log(`✅ Sync and scan complete for ${platform}!`);
    return true;
    
  } catch (error) {
    console.error(`❌ Sync and scan error for ${platform}:`, error);
    return false;
  }
};

/**
 * Batch version: Sync and scan multiple platforms at once
 */
export const syncAndScanMultiplePlatforms = async (
  platforms: Array<{
    platform: PlatformId;
    channelUrl: string;
    videos: ChannelVideo[];
  }>,
  userId?: string,
  isGuest: boolean = false,
  onStatusUpdate?: (videoId: string, status: ScanStatus, result?: ScanResult) => void
): Promise<boolean> => {
  try {
    console.log(`🔄 Starting batch sync and scan for ${platforms.length} platform(s)...`);
    
    for (const { platform, channelUrl, videos } of platforms) {
      const success = await syncAndScanPlatformVideos(
        platform,
        channelUrl,
        videos,
        userId,
        isGuest,
        onStatusUpdate
      );
      
      if (!success) {
        console.warn(`⚠️ Failed to sync platform: ${platform}`);
      }
    }
    
    console.log(`✅ Batch sync and scan complete!`);
    return true;
    
  } catch (error) {
    console.error(`❌ Batch sync and scan error:`, error);
    return false;
  }
};
