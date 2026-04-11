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

// Platform-specific video title templates
const VIDEO_TEMPLATES: Record<PlatformId, string[]> = {
  youtube: [
    "Complete Guide to {topic} in 2024",
    "How I Grew My Channel to 100K Subscribers",
    "{topic} Tutorial for Beginners",
    "Top 10 {topic} Tips You Need to Know",
    "My Honest Review of {topic}",
    "The Truth About {topic} Nobody Tells You",
    "{topic} vs {topic2} - Which is Better?",
    "I Tried {topic} for 30 Days - Results",
    "Ultimate {topic} Masterclass",
    "Why {topic} is Changing Everything",
  ],
  tiktok: [
    "POV: You discover {topic} #fyp #viral",
    "Wait for it... {topic} edition 😱",
    "This {topic} hack changed my life",
    "Day {num} of trying {topic}",
    "Nobody talks about {topic} 🤫",
    "{topic} be like... 😂 #relatable",
    "Try this {topic} trend!",
    "Rating viral {topic} hacks",
    "Storytime: My {topic} experience",
    "When {topic} goes wrong 💀",
  ],
  instagram: [
    "Behind the scenes: {topic} 🎬",
    "My {topic} journey so far ✨",
    "Transform your {topic} game",
    "Aesthetic {topic} inspiration",
    "Day in my life: {topic} edition",
    "Recreating viral {topic} trends",
    "{topic} tips that actually work",
    "Get ready with me: {topic} special",
    "Unboxing my new {topic} setup",
    "Q&A: All about {topic}",
  ],
  facebook: [
    "Amazing {topic} compilation",
    "Watch what happens with {topic}",
    "The best {topic} moments caught on camera",
    "How to master {topic} - Full Video",
    "{topic} fails and wins",
    "Incredible {topic} transformation",
    "Why everyone is talking about {topic}",
    "Complete {topic} breakdown",
    "Family-friendly {topic} fun",
    "{topic} challenge accepted!",
  ],
  dailymotion: [
    "{topic} documentary - Full Length",
    "Professional {topic} analysis",
    "{topic} explained in detail",
    "Expert interview: {topic} insights",
    "Behind the scenes of {topic}",
    "{topic} masterclass series",
    "Understanding {topic} fundamentals",
    "{topic} case study breakdown",
    "Advanced {topic} techniques",
    "{topic} industry report 2024",
  ],
};

const TOPICS = [
  "Content Creation", "Video Editing", "Social Media Growth",
  "Monetization", "AI Tools", "Thumbnail Design",
  "Algorithm Hacks", "Audience Engagement", "Brand Deals",
  "Analytics", "Live Streaming", "Short Form Content"
];

const TOPICS2 = [
  "YouTube Strategy", "TikTok Trends", "Instagram Reels",
  "Facebook Marketing", "Platform Growth", "Viral Content"
];

// Extract username/channel from URL
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

// Generate platform-specific thumbnail URL
const generateThumbnail = (platformId: PlatformId, videoId: string, index: number): string => {
  switch (platformId) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'tiktok':
      return `https://picsum.photos/seed/tiktok${videoId}/320/180`;
    case 'instagram':
      return `https://picsum.photos/seed/ig${videoId}/320/180`;
    case 'facebook':
      return `https://picsum.photos/seed/fb${videoId}/320/180`;
    case 'dailymotion':
      return `https://picsum.photos/seed/dm${videoId}/320/180`;
    default:
      return `https://picsum.photos/seed/${videoId}/320/180`;
  }
};

// Generate platform-specific video URL
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

// Generate realistic duration based on platform
const generateDuration = (platformId: PlatformId): number => {
  switch (platformId) {
    case 'youtube':
      return Math.floor(Math.random() * 1200) + 300; // 5-25 minutes
    case 'tiktok':
      return Math.floor(Math.random() * 45) + 15; // 15-60 seconds
    case 'instagram':
      return Math.floor(Math.random() * 540) + 30; // 30 sec - 10 min
    case 'facebook':
      return Math.floor(Math.random() * 900) + 60; // 1-16 minutes
    case 'dailymotion':
      return Math.floor(Math.random() * 900) + 180; // 3-18 minutes
    default:
      return Math.floor(Math.random() * 600) + 120;
  }
};

// Generate realistic view count
const generateViews = (platformId: PlatformId): number => {
  switch (platformId) {
    case 'youtube':
      return Math.floor(Math.random() * 900000) + 10000;
    case 'tiktok':
      return Math.floor(Math.random() * 4500000) + 50000;
    case 'instagram':
      return Math.floor(Math.random() * 800000) + 5000;
    case 'facebook':
      return Math.floor(Math.random() * 600000) + 20000;
    case 'dailymotion':
      return Math.floor(Math.random() * 200000) + 5000;
    default:
      return Math.floor(Math.random() * 500000) + 10000;
  }
};

/**
 * Fetch realistic channel videos for a platform
 * In production: Replace with actual API calls (YouTube Data API, TikTok API, etc.)
 */
export const fetchChannelVideos = async (
  platformId: PlatformId,
  channelUrl: string
): Promise<ChannelVideo[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
  
  const channelName = extractChannelName(channelUrl);
  const templates = VIDEO_TEMPLATES[platformId];
  const numVideos = Math.floor(Math.random() * 6) + 10; // 10-15 videos
  
  const videos: ChannelVideo[] = [];
  
  for (let i = 0; i < numVideos; i++) {
    const videoId = `${platformId}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
    const template = templates[i % templates.length];
    
    // Replace placeholders with realistic data
    let title = template
      .replace('{topic}', TOPICS[Math.floor(Math.random() * TOPICS.length)])
      .replace('{topic2}', TOPICS2[Math.floor(Math.random() * TOPICS2.length)])
      .replace('{num}', String(Math.floor(Math.random() * 30) + 1));
    
    // Add channel name to some titles
    if (Math.random() > 0.5) {
      title = `${title} | ${channelName}`;
    }
    
    // Generate realistic publish dates (last 90 days)
    const daysAgo = Math.floor(Math.random() * 90);
    const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    videos.push({
      videoId,
      title,
      thumbnail: generateThumbnail(platformId, videoId, i),
      platformId,
      publishedAt,
      durationSeconds: generateDuration(platformId),
      views: generateViews(platformId),
      channelUrl,
      videoUrl: generateVideoUrl(platformId, videoId, channelUrl),
    });
  }
  
  // Sort by publish date (newest first)
  return videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};
