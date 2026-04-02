/**
 * URL Validation and Platform Detection Helper
 * Specialized for TikTok, Instagram, and multi-platform support
 */

export interface ValidationResult {
  isValid: boolean;
  platform: string;
  videoId: string | null;
  normalizedUrl: string;
  error?: string;
}

/**
 * Comprehensive regex patterns for supported platforms
 */
const PLATFORM_PATTERNS = {
  youtube: [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
  ],
  tiktok: [
    /^(https?:\/\/)?(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+.*$/,
    /^(https?:\/\/)?vt\.tiktok\.com\/[\w]+\/?$/,
    /^(https?:\/\/)?(www\.)?tiktok\.com\/t\/[\w-]+\/\d+.*$/,
  ],
  instagram: [
    /^(https?:\/\/)?(www\.)?instagram\.com\/reel\/[\w-]+\/?(\?.*)?$/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/reels\/[\w-]+\/?(\?.*)?$/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/tv\/[\w-]+\/?(\?.*)?$/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/p\/[\w-]+\/?(\?.*)?$/,
  ],
  facebook: [
    /^(https?:\/\/)?(www\.)?facebook\.com\/.+\/videos\/\d+.*$/,
    /^(https?:\/\/)?fb\.watch\/[\w-]+\/?$/,
    /^(https?:\/\/)?(www\.)?facebook\.com\/watch\/\?v=\d+.*$/,
  ],
  dailymotion: [
    /^(https?:\/\/)?(www\.)?dailymotion\.com\/video\/[\w]+.*$/,
  ],
};

/**
 * Validate if a URL belongs to a supported platform
 */
export const validateUrl = (url: string): ValidationResult => {
  try {
    const trimmedUrl = url.trim();
    
    // Check if it's a valid URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return {
        isValid: false,
        platform: 'unknown',
        videoId: null,
        normalizedUrl: '',
        error: 'Invalid URL format',
      };
    }

    // Detect platform
    const platform = detectPlatform(trimmedUrl);
    
    if (platform === 'unknown') {
      return {
        isValid: false,
        platform: 'unknown',
        videoId: null,
        normalizedUrl: '',
        error: 'Unsupported platform',
      };
    }

    // Extract video ID based on platform
    const videoId = extractVideoId(trimmedUrl, platform);
    
    if (!videoId) {
      return {
        isValid: false,
        platform,
        videoId: null,
        normalizedUrl: trimmedUrl,
        error: 'Could not extract video ID',
      };
    }

    return {
      isValid: true,
      platform,
      videoId,
      normalizedUrl: trimmedUrl,
    };
  } catch (error) {
    return {
      isValid: false,
      platform: 'unknown',
      videoId: null,
      normalizedUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Detect platform from URL using comprehensive pattern matching
 */
export const detectPlatform = (inputUrl: string): string => {
  const url = inputUrl.toLowerCase();
  
  // YouTube
  if (PLATFORM_PATTERNS.youtube.some(pattern => pattern.test(url))) {
    return 'youtube';
  }
  
  // TikTok - Check specific patterns first
  if (url.includes('vt.tiktok.com') || 
      url.includes('tiktok.com/@') || 
      url.includes('/video/') ||
      url.includes('tiktok.com/t/')) {
    return 'tiktok';
  }
  
  // Instagram - Multiple URL patterns
  if (url.includes('instagram.com/reel/') || 
      url.includes('instagram.com/reels/') || 
      url.includes('instagram.com/tv/') ||
      url.includes('instagram.com/p/')) {
    return 'instagram';
  }
  
  // Facebook
  if (url.includes('facebook.com') && url.includes('/videos/') ||
      url.includes('fb.watch') ||
      url.includes('facebook.com/watch')) {
    return 'facebook';
  }
  
  // Dailymotion
  if (url.includes('dailymotion.com/video')) {
    return 'dailymotion';
  }
  
  return 'unknown';
};

/**
 * Extract video ID based on platform-specific patterns
 */
export const extractVideoId = (videoUrl: string, platformId: string): string | null => {
  try {
    const url = new URL(videoUrl);
    
    switch (platformId.toLowerCase()) {
      case "youtube": {
        const vParam = url.searchParams.get('v');
        if (vParam) return vParam;
        
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1] || null;
      }
      
      case "tiktok": {
        // Support both tiktok.com and vt.tiktok.com
        const pathParts = url.pathname.split('/');
        const videoIndex = pathParts.findIndex(p => p === 'video');
        if (videoIndex !== -1 && videoIndex < pathParts.length - 1) {
          return pathParts[videoIndex + 1];
        }
        // For vt.tiktok.com short links
        return pathParts[pathParts.length - 1] || null;
      }
      
      case "instagram": {
        // Support reels, tv, and regular posts
        const pathParts = url.pathname.split('/');
        const reelIndex = pathParts.findIndex(p => 
          p === 'reel' || p === 'tv' || p === 'reels' || p === 'p'
        );
        if (reelIndex !== -1 && reelIndex < pathParts.length - 1) {
          return pathParts[reelIndex + 1];
        }
        // Fallback: last part of URL
        return pathParts[pathParts.length - 1] || null;
      }
      
      case "facebook": {
        // Support multiple Facebook URL patterns
        const pathParts = url.pathname.split('/');
        // Look for /videos/ pattern
        const videoIndex = pathParts.findIndex(p => p === 'videos');
        if (videoIndex !== -1 && videoIndex < pathParts.length - 1) {
          return pathParts[videoIndex + 1];
        }
        // Look for numeric video ID in URL
        const numericId = pathParts.find(p => /^\d+$/.test(p));
        if (numericId) return numericId;
        // Fallback
        return pathParts[pathParts.length - 1] || null;
      }
      
      case "dailymotion": {
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1] || null;
      }
      
      default:
        return null;
    }
  } catch {
    return null;
  }
};

/**
 * Normalize URL for consistent display
 */
export const normalizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url.trim());
    return parsedUrl.toString();
  } catch {
    return url;
  }
};

/**
 * Check if URL is from a protected platform (TikTok/Instagram)
 * These platforms have strict CORS and anti-scraping measures
 */
export const isProtectedPlatform = (platform: string): boolean => {
  return ['tiktok', 'instagram'].includes(platform.toLowerCase());
};

/**
 * Get platform display name with proper capitalization
 */
export const getPlatformDisplayName = (platform: string): string => {
  const names: Record<string, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    facebook: 'Facebook',
    dailymotion: 'Dailymotion',
  };
  
  return names[platform.toLowerCase()] || platform;
};

/**
 * Get platform-specific emoji/icon representation
 */
export const getPlatformEmoji = (platform: string): string => {
  const emojis: Record<string, string> = {
    youtube: '📺',
    tiktok: '🎵',
    instagram: '📸',
    facebook: '📘',
    dailymotion: '🎬',
  };
  
  return emojis[platform.toLowerCase()] || '🌐';
};
