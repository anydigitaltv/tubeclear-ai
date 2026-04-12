import type { PlatformId } from "@/contexts/PlatformContext";

export interface ChannelVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  platformId: PlatformId;
  publishedAt: string;
  durationSeconds: number;
  views: number;
  channelUrl: string;
  videoUrl: string;
}

/**
 * Extract username/channel from URL
 */
const extractChannelName = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Try to get username from common patterns
    for (const part of pathParts) {
      if (!['watch', 'video', 'reel', 'videos', 'page'].includes(part)) {
        return part.replace('@', '');
      }
    }
    return pathParts[0] || 'creator';
  } catch {
    return url.split('/').pop()?.replace('@', '') || 'creator';
  }
};

/**
 * Generate platform-specific video URL
 */
const generateVideoUrl = (platformId: PlatformId, videoId: string, channelUrl: string): string => {
  const baseUrl = channelUrl.split('/').slice(0, 3).join('/');
  
  switch (platformId) {
    case 'youtube':
      return `https://youtube.com/watch?v=${videoId}`;
    case 'tiktok':
      return `https://tiktok.com/@${extractChannelName(channelUrl)}/video/${videoId}`;
    case 'instagram':
      return `https://instagram.com/reel/${videoId}`;
    case 'facebook':
      return `https://facebook.com/watch/?v=${videoId}`;
    case 'dailymotion':
      return `https://dailymotion.com/video/${videoId}`;
    default:
      return `${baseUrl}/video/${videoId}`;
  }
};

/**
 * Fetch channel videos from connected platform
 * 
 * PRODUCTION READY: This function now returns empty array by default.
 * To enable real video fetching, integrate platform APIs:
 * 
 * YouTube: YouTube Data API v3 (channels.list + search.list)
 * TikTok: TikTok API for Business
 * Instagram: Instagram Graph API
 * Facebook: Facebook Graph API  
 * Dailymotion: Dailymotion API
 * 
 * @param platformId - Platform identifier
 * @param channelUrl - Channel URL or ID
 * @returns Array of ChannelVideo (empty until real API integration)
 */
export const fetchChannelVideos = async (
  platformId: PlatformId,
  channelUrl: string
): Promise<ChannelVideo[]> => {
  console.log(`📡 Fetching videos from ${platformId}: ${channelUrl}`);
  
  // TODO: INTEGRATE REAL PLATFORM APIs HERE
  // Uncomment and configure the appropriate API call below:
  
  /*
  // YOUTUBE API EXAMPLE:
  if (platformId === 'youtube') {
    const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
    const channelId = extractChannelId(channelUrl);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=50&type=video`
    );
    const data = await response.json();
    
    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      platformId: 'youtube' as PlatformId,
      publishedAt: item.snippet.publishedAt,
      durationSeconds: 0, // Requires separate API call to videos endpoint
      views: 0, // Requires statistics from videos endpoint
      channelUrl,
      videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  }
  
  // TIKTOK API EXAMPLE:
  if (platformId === 'tiktok') {
    // Use TikTok API for Business
    // Returns video list with thumbnails and metadata
  }
  
  // INSTAGRAM API EXAMPLE:
  if (platformId === 'instagram') {
    // Use Instagram Graph API
    // Returns media items with thumbnails
  }
  
  // FACEBOOK API EXAMPLE:
  if (platformId === 'facebook') {
    // Use Facebook Graph API
    // Returns video posts with thumbnails
  }
  
  // DAILYMOTION API EXAMPLE:
  if (platformId === 'dailymotion') {
    // Use Dailymotion API
    // Returns videos with thumbnails
  }
  */
  
  // RETURN EMPTY ARRAY - No fake data
  console.warn(`⚠️ No real API integration for ${platformId}. Returning empty array.`);
  console.warn(`📝 To enable video fetching, integrate ${platformId} API in channelVideoFetcher.ts`);
  
  return [];
};
