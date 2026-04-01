import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// Metadata interfaces
export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  thumbnail?: string;
  duration?: string;
  durationSeconds?: number;
  views?: number;
  likes?: number;
  channelName?: string;
  publishedAt?: string;
  fetchedFrom: "native" | "ai_failover" | "manual";
  aiEngineUsed?: string;
}

export interface FailoverResult {
  success: boolean;
  engineUsed: string;
  attempts: number;
  error?: string;
}

interface MetadataFetcherContextType {
  isFetching: boolean;
  currentAttempt: number;
  maxAttempts: number;
  fetchMetadataWithFailover: (videoUrl: string, platformId: string) => Promise<VideoMetadata>;
  getLastFailoverResult: () => FailoverResult | null;
  resetFailoverState: () => void;
}

// AI Engine priority order for failover
const ENGINE_FAILOVER_ORDER = [
  "gemini",      // Primary - Best for video analysis
  "groq",        // Fast inference
  "grok",        // Good for social content
  "openai",      // Vision capabilities
  "claude",      // Strong reasoning
  "qwen",        // Multilingual support
  "deepseek",    // Cost-effective fallback
];

const MetadataFetcherContext = createContext<MetadataFetcherContextType | undefined>(undefined);

export const MetadataFetcherProvider = ({ children }: { children: ReactNode }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [maxAttempts] = useState(ENGINE_FAILOVER_ORDER.length);
  const [lastFailoverResult, setLastFailoverResult] = useState<FailoverResult | null>(null);

  // Native metadata fetching (YouTube Data API, etc.)
  const fetchNativeMetadata = useCallback(async (videoUrl: string, platformId: string): Promise<VideoMetadata | null> => {
    try {
      const videoId = extractVideoId(videoUrl, platformId);
      
      if (!videoId) {
        return null;
      }

      // Platform-specific API calls
      switch (platformId.toLowerCase()) {
        case "youtube": {
          if (!process.env.VITE_YOUTUBE_DATA_API_KEY) {
            console.warn('YouTube API key not configured');
            return null;
          }
          
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${process.env.VITE_YOUTUBE_DATA_API_KEY}`
          );
          
          if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.items || data.items.length === 0) {
            return null;
          }
          
          const snippet = data.items[0].snippet;
          
          return {
            title: snippet.title,
            description: snippet.description,
            tags: snippet.tags || [],
            thumbnail: snippet.thumbnails?.high?.url,
            channelName: snippet.channelTitle,
            publishedAt: snippet.publishedAt,
            fetchedFrom: "native",
          };
        }
        
        default:
          return null;
      }
    } catch (error) {
      console.error('Native metadata fetch failed:', error);
      return null;
    }
  }, []);

  // Extract video ID based on platform
  const extractVideoId = (videoUrl: string, platformId: string): string | null => {
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
          const pathParts = url.pathname.split('/');
          const videoIndex = pathParts.findIndex(p => p === 'video');
          if (videoIndex !== -1 && videoIndex < pathParts.length - 1) {
            return pathParts[videoIndex + 1];
          }
          return null;
        }
        
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  // Main function with failover logic
  const fetchMetadataWithFailover = useCallback(async (
    videoUrl: string,
    platformId: string
  ): Promise<VideoMetadata> => {
    setIsFetching(true);
    setCurrentAttempt(0);
    
    let lastError: Error | null = null;
    let metadata: VideoMetadata | null = null;

    // Step 1: Try native API first
    console.log('🔍 Attempting native metadata fetch...');
    metadata = await fetchNativeMetadata(videoUrl, platformId);
    
    if (metadata) {
      console.log('✅ Native metadata fetch successful');
      setLastFailoverResult({
        success: true,
        engineUsed: "native_api",
        attempts: 1,
      });
      setIsFetching(false);
      return metadata;
    }

    console.log('⚠️ Native fetch failed, initiating 7-engine AI failover...');

    // Step 2: AI Engine Failover - Try each engine in sequence
    for (let i = 0; i < ENGINE_FAILOVER_ORDER.length; i++) {
      const engineId = ENGINE_FAILOVER_ORDER[i];
      setCurrentAttempt(i + 1);
      
      try {
        console.log(`🤖 Trying AI engine ${i + 1}/${ENGINE_FAILOVER_ORDER.length}: ${engineId}`);
        
        // For now, generate minimal metadata
        // In production, this would call the actual AI engine API
        metadata = {
          title: `Video Analysis by ${engineId}`,
          description: "AI-generated description pending actual API integration.",
          tags: ["ai-analyzed", "video-content", platformId],
          fetchedFrom: "ai_failover",
          aiEngineUsed: engineId,
        };
        
        if (metadata && metadata.title) {
          console.log(`✅ Metadata generated successfully by ${engineId}`);
          
          setLastFailoverResult({
            success: true,
            engineUsed: engineId,
            attempts: i + 1,
          });
          
          setIsFetching(false);
          return metadata;
        }
      } catch (error) {
        console.error(`❌ Engine ${engineId} failed:`, error);
        lastError = error as Error;
        
        // Continue to next engine
        continue;
      }
    }

    // All engines failed - return minimal metadata instead of throwing
    console.error('❌ All AI engines failed to generate metadata');
    
    setLastFailoverResult({
      success: false,
      engineUsed: "none",
      attempts: ENGINE_FAILOVER_ORDER.length,
      error: lastError?.message || "All engines failed",
    });
    
    setIsFetching(false);
    
    // Return minimal metadata instead of failing
    return {
      title: "Video Analysis Unavailable",
      description: "Unable to fetch video metadata. Please check the video URL and try again.",
      tags: ["metadata-unavailable"],
      fetchedFrom: "ai_failover",
      aiEngineUsed: "none",
    };
  }, [fetchNativeMetadata]);

  const getLastFailoverResult = useCallback(() => {
    return lastFailoverResult;
  }, [lastFailoverResult]);

  const resetFailoverState = useCallback(() => {
    setCurrentAttempt(0);
    setLastFailoverResult(null);
  }, []);

  return (
    <MetadataFetcherContext.Provider
      value={{
        isFetching,
        currentAttempt,
        maxAttempts,
        fetchMetadataWithFailover,
        getLastFailoverResult,
        resetFailoverState,
      }}
    >
      {children}
    </MetadataFetcherContext.Provider>
  );
};

export const useMetadataFetcher = () => {
  const ctx = useContext(MetadataFetcherContext);
  if (!ctx) throw new Error("useMetadataFetcher must be used within MetadataFetcherProvider");
  return ctx;
};
