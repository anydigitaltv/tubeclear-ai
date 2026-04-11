/**
 * Rate Limiter for Admin API Protection
 * Prevents abuse and keeps API keys safe
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const RATE_LIMIT_STORAGE_KEY = "tubeclear_rate_limits";
const DEFAULT_MAX_REQUESTS = 5; // 5 scans per window
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = DEFAULT_MAX_REQUESTS, windowMs: number = DEFAULT_WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if user can make a request
   */
  canMakeRequest(userId: string = "anonymous"): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const limits = this.getLimits();
    const now = Date.now();
    const entry = limits[userId];

    // No previous requests - allow
    if (!entry) {
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Window expired - reset
    if (now - entry.firstAttempt >= this.windowMs) {
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Within window - check count
    const remaining = this.maxRequests - entry.count;

    if (remaining > 0) {
      return {
        allowed: true,
        remaining: remaining - 1,
        resetAt: entry.firstAttempt + this.windowMs,
      };
    }

    // Rate limited
    const retryAfter = entry.firstAttempt + this.windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.firstAttempt + this.windowMs,
      retryAfter: Math.ceil(retryAfter / 1000), // seconds
    };
  }

  /**
   * Record a request
   */
  recordRequest(userId: string = "anonymous"): void {
    const limits = this.getLimits();
    const now = Date.now();
    const entry = limits[userId];

    if (!entry || now - entry.firstAttempt >= this.windowMs) {
      // New window
      limits[userId] = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
    } else {
      // Existing window
      entry.count++;
      entry.lastAttempt = now;
    }

    this.saveLimits(limits);
  }

  /**
   * Reset rate limit for user
   */
  resetLimit(userId: string = "anonymous"): void {
    const limits = this.getLimits();
    delete limits[userId];
    this.saveLimits(limits);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const limits = this.getLimits();
    const now = Date.now();
    let cleaned = 0;

    Object.keys(limits).forEach(userId => {
      const entry = limits[userId];
      if (now - entry.firstAttempt >= this.windowMs) {
        delete limits[userId];
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.saveLimits(limits);
      console.log(`Cleaned ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get current usage stats
   */
  getUsage(userId: string = "anonymous"): {
    used: number;
    remaining: number;
    limit: number;
    windowReset: number;
  } {
    const limits = this.getLimits();
    const entry = limits[userId];
    const now = Date.now();

    if (!entry || now - entry.firstAttempt >= this.windowMs) {
      return {
        used: 0,
        remaining: this.maxRequests,
        limit: this.maxRequests,
        windowReset: now + this.windowMs,
      };
    }

    return {
      used: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      limit: this.maxRequests,
      windowReset: entry.firstAttempt + this.windowMs,
    };
  }

  private getLimits(): Record<string, RateLimitEntry> {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveLimits(limits: Record<string, RateLimitEntry>): void {
    try {
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
    } catch (error) {
      console.error("Failed to save rate limits:", error);
    }
  }
}

// Global rate limiter instance
export const adminApiRateLimiter = new RateLimiter(5, 60 * 1000); // 5 requests per minute

/**
 * Hook-friendly rate limit checker
 */
export const checkRateLimit = (userId?: string): {
  allowed: boolean;
  message: string;
  retryAfter?: number;
  remaining: number;
} => {
  const result = adminApiRateLimiter.canMakeRequest(userId);

  if (result.allowed) {
    return {
      allowed: true,
      message: `Scan allowed (${result.remaining} remaining this minute)`,
      remaining: result.remaining,
    };
  }

  return {
    allowed: false,
    message: `Rate limit exceeded. Please wait ${result.retryAfter} seconds or use your own API key.`,
    retryAfter: result.retryAfter,
    remaining: 0,
  };
};

/**
 * Record scan for rate limiting
 */
export const recordScan = (userId?: string): void => {
  adminApiRateLimiter.recordRequest(userId);
};
