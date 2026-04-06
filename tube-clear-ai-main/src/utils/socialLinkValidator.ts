// Social Media Link Validator
// Validates platform-specific URLs with regex patterns and user-friendly error messages

export interface ValidationResult {
  valid: boolean;
  msg: string;
  platform?: string;
  example?: string;
}

export const validateSocialLink = (platform: string, url: string): ValidationResult => {
  // 1. URL Basic Structure Check
  try {
    new URL(url);
  } catch (_) {
    return { 
      valid: false, 
      msg: "Bhai, ye link hi nahi hai! Poora URL (https://...) dalein.",
      platform,
    };
  }

  const rules: Record<string, { regex: RegExp; example: string }> = {
    YouTube: {
      regex: /^(https?:\/\/)?(www\.)?(youtube\.com\/(@|c\/|channel\/|user\/)|youtu\.be\/).+$/,
      example: "youtube.com/@username"
    },
    TikTok: {
      regex: /^(https?:\/\/)?(www\.)?tiktok\.com\/@.+\/?$/,
      example: "tiktok.com/@username"
    },
    Instagram: {
      regex: /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
      example: "instagram.com/username"
    },
    Facebook: {
      regex: /^(https?:\/\/)?(www\.)?facebook\.com\/(groups\/|pages\/|profile\.php\?id=|[a-zA-Z0-9.]+).+$/,
      example: "facebook.com/username"
    },
    Dailymotion: {
      regex: /^(https?:\/\/)?(www\.)?dailymotion\.com\/(.+)$/,
      example: "dailymotion.com/video/..."
    }
  };

  const platformRule = rules[platform];
  
  // If platform not supported
  if (!platformRule) {
    return {
      valid: false,
      msg: `Platform "${platform}" supported nahi hai.`,
      platform,
    };
  }
  
  // 2. Platform mismatch check
  if (!platformRule.regex.test(url)) {
    return { 
      valid: false, 
      msg: `Ye ${platform} ka sahi link nahi lag raha. Example: ${platformRule.example}`,
      platform,
      example: platformRule.example,
    };
  }

  return { 
    valid: true, 
    msg: "Link verified!",
    platform,
  };
};

// Helper function to extract username/handle from URL
export const extractUsername = (platform: string, url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    switch (platform) {
      case "YouTube":
        // youtube.com/@username or youtu.be/xxx
        if (pathname.startsWith('/@')) {
          return pathname.substring(2);
        }
        if (pathname.startsWith('/c/') || pathname.startsWith('/channel/') || pathname.startsWith('/user/')) {
          return pathname.split('/')[2];
        }
        return null;

      case "TikTok":
        // tiktok.com/@username
        if (pathname.startsWith('/@')) {
          return pathname.substring(2);
        }
        return null;

      case "Instagram":
        // instagram.com/username
        return pathname.replace(/^\//, '').replace(/\/$/, '');

      case "Facebook":
        // facebook.com/username or facebook.com/pages/xxx
        if (pathname.startsWith('/pages/') || pathname.startsWith('/groups/')) {
          return pathname.split('/')[2];
        }
        return pathname.replace(/^\//, '').replace(/\/$/, '');

      case "Dailymotion":
        // dailymotion.com/video/xxx or dailymotion.com/username
        return pathname.replace(/^\//, '').replace(/\/$/, '');

      default:
        return null;
    }
  } catch {
    return null;
  }
};

// Helper to normalize URL (add https:// if missing)
export const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};
