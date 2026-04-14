/**
 * Scan Helper Utilities
 * Timeout, Retry, Delay, Caching, Error Recovery
 */

// ====================
// Timeout Protection
// ====================
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = "Request timed out"
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
};

// ====================
// Retry Logic with Exponential Backoff
// ====================
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// ====================
// Rate Limit Delay
// ====================
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const withRateLimitDelay = async <T>(
  fn: () => Promise<T>,
  delayMs: number = 1000
): Promise<T> => {
  const result = await fn();
  await delay(delayMs);
  return result;
};

// ====================
// Result Caching
// ====================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class ScanCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number; // Time to live in ms

  constructor(defaultTTLMinutes: number = 60) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache hit for: ${key}`);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs || this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    console.log(`💾 Cached: ${key} (expires in ${ttl / 60000}min)`);
  }

  clear(): void {
    this.cache.clear();
    console.log("🗑️ Cache cleared");
  }

  size(): number {
    return this.cache.size;
  }

  // Generate cache key from scan input
  static generateKey(videoUrl: string, platformId: string): string {
    return `scan:${platformId}:${videoUrl}`;
  }
}

// Global cache instance
export const scanCache = new ScanCache(60); // 1 hour TTL

// ====================
// Error Recovery with Partial Results
// ====================
export const withFallback = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    console.warn(`⚠️ ${errorMessage || "Operation failed"}, using fallback:`, error.message);
    return fallback;
  }
};

// ====================
// API Call Wrapper (combines all protections)
// ====================
export interface APICallOptions {
  timeout?: number;
  retries?: number;
  rateLimitDelay?: number;
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  fallback?: any;
}

export const safeAPICall = async <T>(
  fn: () => Promise<T>,
  options: APICallOptions = {}
): Promise<T> => {
  const {
    timeout = 30000,
    retries = 3,
    rateLimitDelay = 1000,
    useCache = true,
    cacheKey,
    cacheTTL,
    fallback,
  } = options;

  // Check cache first
  if (useCache && cacheKey) {
    const cached = scanCache.get<T>(cacheKey);
    if (cached) return cached;
  }

  // Execute with retry + timeout
  const execute = async (): Promise<T> => {
    return withTimeout(fn(), timeout, "API call timed out");
  };

  const result = await withRetry(execute, retries);

  // Apply rate limit delay
  if (rateLimitDelay > 0) {
    await delay(rateLimitDelay);
  }

  // Cache result
  if (useCache && cacheKey) {
    scanCache.set(cacheKey, result, cacheTTL);
  }

  return result;
};

// ====================
// Scan State Persistence
// ====================
export interface ScanState {
  id: string;
  videoUrl: string;
  platformId: string;
  status: "pending" | "running" | "paused" | "failed" | "completed";
  phase: number;
  totalPhases: number;
  error?: string;
  startedAt: number;
  lastUpdatedAt: number;
  partialResults?: any;
}

const PENDING_SCANS_STORAGE = "tubeclear_pending_scans";

export const savePendingScan = (scan: ScanState): void => {
  try {
    const scans = loadPendingScans();
    const existingIndex = scans.findIndex(s => s.id === scan.id);

    if (existingIndex >= 0) {
      scans[existingIndex] = scan;
    } else {
      scans.push(scan);
    }

    localStorage.setItem(PENDING_SCANS_STORAGE, JSON.stringify(scans));
    console.log(`💾 Saved pending scan: ${scan.id}`);
  } catch (error) {
    console.error("Error saving pending scan:", error);
  }
};

export const loadPendingScans = (): ScanState[] => {
  try {
    const stored = localStorage.getItem(PENDING_SCANS_STORAGE);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading pending scans:", error);
    return [];
  }
};

export const removePendingScan = (scanId: string): void => {
  try {
    const scans = loadPendingScans();
    const filtered = scans.filter(s => s.id !== scanId);
    localStorage.setItem(PENDING_SCANS_STORAGE, JSON.stringify(filtered));
    console.log(`🗑️ Removed pending scan: ${scanId}`);
  } catch (error) {
    console.error("Error removing pending scan:", error);
  }
};

export const updatePendingScan = (
  scanId: string,
  updates: Partial<ScanState>
): void => {
  try {
    const scans = loadPendingScans();
    const index = scans.findIndex(s => s.id === scanId);

    if (index >= 0) {
      scans[index] = {
        ...scans[index],
        ...updates,
        lastUpdatedAt: Date.now(),
      };
      localStorage.setItem(PENDING_SCANS_STORAGE, JSON.stringify(scans));
    }
  } catch (error) {
    console.error("Error updating pending scan:", error);
  }
};

export const clearCompletedScans = (): void => {
  try {
    const scans = loadPendingScans();
    const active = scans.filter(s => s.status !== "completed");
    localStorage.setItem(PENDING_SCANS_STORAGE, JSON.stringify(active));
  } catch (error) {
    console.error("Error clearing completed scans:", error);
  }
};

// ====================
// API Key Limit Checker
// ====================
export interface APIKeyStatus {
  hasKeys: boolean;
  keysRemaining: number;
  isExhausted: boolean;
  message: string;
}

export const checkAPIKeyLimits = (
  poolKeys: any[],
  engineId: string
): APIKeyStatus => {
  const activeKeys = poolKeys.filter(k => !k.isExhausted);
  const totalKeys = poolKeys.length;

  if (totalKeys === 0) {
    return {
      hasKeys: false,
      keysRemaining: 0,
      isExhausted: true,
      message: `❌ No ${engineId} API keys configured. Please add keys to continue.`,
    };
  }

  if (activeKeys.length === 0) {
    return {
      hasKeys: false,
      keysRemaining: 0,
      isExhausted: true,
      message: `⚠️ All ${engineId} API keys exhausted (rate limited). Please wait or add more keys.`,
    };
  }

  return {
    hasKeys: true,
    keysRemaining: activeKeys.length,
    isExhausted: false,
    message: `✅ ${activeKeys.length}/${totalKeys} ${engineId} keys available`,
  };
};
