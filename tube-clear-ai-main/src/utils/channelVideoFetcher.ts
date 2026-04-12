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
 */
export const fetchChannelVideos = async (
  platformId: PlatformId,
  channelUrl: string
): Promise<ChannelVideo[]> => {
  console.info(`📡 Requesting videos from ${platformId}: ${channelUrl}`);
  
  // RETURN EMPTY ARRAY - No fake data
  return [];
};
