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
 * Parse ISO 8601 duration (e.g., PT1M30S) to seconds
 */
const parseISO8601Duration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Fetch channel videos from connected platform
 * Using YouTube Data API v3 for real integration
 */
export const fetchChannelVideos = async (
  platformId: PlatformId,
  channelUrl: string
): Promise<ChannelVideo[]> => {
  console.info(`📡 Requesting videos from ${platformId}: ${channelUrl}`);
  
  if (platformId === 'youtube') {
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.error("❌ YouTube API Key is missing in environment variables!");
        return [];
      }

      // 1. Extract Channel ID or Handle
      let channelId = '';
      const handleMatch = channelUrl.match(/@([^/?]+)/);
      
      if (handleMatch) {
        // Resolve handle to channel ID
        const resolveRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${handleMatch[1]}&key=${apiKey}`
        );
        const resolveData = await resolveRes.json();
        channelId = resolveData.items?.[0]?.id;
      } else {
        // Try to extract direct ID (UC...)
        const idMatch = channelUrl.match(/channel\/(UC[^/?]+)/);
        channelId = idMatch ? idMatch[1] : '';
      }

      if (!channelId) {
        console.warn("⚠️ Could not extract a valid YouTube Channel ID from URL");
        return [];
      }

      // 2. Fetch latest 20 videos using search endpoint
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=20&order=date&type=video&key=${apiKey}`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!data.items) return [];

      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      
      // 3. Fetch extra details (views, duration) for professional reporting
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
      const statsRes = await fetch(statsUrl);
      const statsData = await statsRes.json();

      return data.items.map((item: any) => {
        const stats = statsData.items?.find((s: any) => s.id === item.id.videoId);
        
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
          platformId: 'youtube',
          publishedAt: item.snippet.publishedAt,
          durationSeconds: stats ? parseISO8601Duration(stats.contentDetails.duration) : 0, 
          views: stats ? parseInt(stats.statistics.viewCount) || 0 : 0,
          channelUrl: channelUrl,
          videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        };
      });
    } catch (error) {
      console.error("❌ Error fetching YouTube videos:", error);
      return [];
    }
  }

  return [];
};
