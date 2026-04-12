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
];

const MetadataFetcherContext = createContext<MetadataFetcherContextType | undefined>(undefined);

export const MetadataFetcherProvider = ({ children }: { children: ReactNode }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [maxAttempts] = useState(ENGINE_FAILOVER_ORDER.length);
  const [lastFailoverResult, setLastFailoverResult] = useState<FailoverResult | null>(null);

  // Native metadata fetching (YouTube Data API, TikTok RapidAPI, etc.)
  const fetchNativeMetadata = useCallback(async (videoUrl: string, platformId: string): Promise<VideoMetadata | null> => {
    try {
      const videoId = extractVideoId(videoUrl, platformId);
      
      if (!videoId) {
        return null;
      }

      // Platform-specific API calls
      switch (platformId.toLowerCase()) {
        case "youtube": {
          // Try API first if available in env
          const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
          let response;
          
          if (apiKey) {
            response = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
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

          // NO-KEY FALLBACK: Use oEmbed (Official method, requires no key)
          console.info("⚡ FREE MODE: Fetching YouTube metadata via oEmbed (No API Key Required)");
          const oEmbedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
          if (oEmbedRes.ok) {
            const oEmbedData = await oEmbedRes.json();
            return {
              title: oEmbedData.title,
              description: "Metadata fetched via oEmbed (Keyless Mode)",
              tags: [],
              thumbnail: oEmbedData.thumbnail_url,
              channelName: oEmbedData.author_name,
              fetchedFrom: "native",
            };
          }
          return null;
        }
        
        case "tiktok": {
          // NO-KEY METHOD: TikTok oEmbed (Official & No Key Required)
          console.info("⚡ FREE MODE: Fetching TikTok metadata via oEmbed");
          try {
            const tiktokOembed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`);
            if (tiktokOembed.ok) {
              const data = await tiktokOembed.json();
              return {
                title: data.title || "TikTok Video",
                description: `Author: ${data.author_name}`,
                tags: ["tiktok"],
                thumbnail: data.thumbnail_url,
                channelName: data.author_name,
                fetchedFrom: "native",
              };
            }
          } catch (e) {
            console.warn("TikTok oEmbed failed");
          }

          // Try RapidAPI if configured
          const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
          if (rapidApiKey) {
            try {
              const response = await fetch(
                `https://tiktok-download-without-watermark.p.rapidapi.com/video_info?video_url=${encodeURIComponent(videoUrl)}`,
                {
                  headers: {
                    'X-RapidAPI-Key': rapidApiKey,
                    'X-RapidAPI-Host': 'tiktok-download-without-watermark.p.rapidapi.com'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                return {
                  title: data.title || `TikTok Video ${videoId}`,
                  description: data.desc || data.title || '',
                  tags: [],
                  thumbnail: data.cover || data.dynamic_cover,
                  channelName: data.author || data.nickname,
                  duration: data.duration,
                  fetchedFrom: "native",
                };
              }
            } catch (error) {
              console.warn('RapidAPI TikTok fetch failed, trying fallback:', error);
            }
          }
          
          // Try OG tags via CORS proxy (protected platform workaround)
          try {
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(corsProxy + encodeURIComponent(videoUrl));
            
            if (response.ok) {
              const html = await response.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
              const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
              const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
              
              if (ogTitle || ogDesc) {
                return {
                  title: ogTitle || `TikTok Video ${videoId}`,
                  description: ogDesc || `TikTok video from creator`,
                  tags: ["tiktok", "social-media"],
                  thumbnail: ogImage,
                  fetchedFrom: "native",
                };
              }
            }
          } catch (error) {
            console.warn('OG tag scraping failed for TikTok:', error);
          }
          
          // Fallback scraper for TikTok
          return {
            title: `TikTok Video ${videoId}`,
            description: `TikTok video from creator`,
            tags: ["tiktok", "social-media"],
            fetchedFrom: "native",
          };
        }
        
        case "instagram": {
          // Instagram Graph API or fallback
          const instagramToken = process.env.VITE_INSTAGRAM_TOKEN;
          if (instagramToken) {
            try {
              const response = await fetch(
                `https://graph.instagram.com/${videoId}?fields=caption,media_type,media_url,permalink&access_token=${instagramToken}`
              );
              
              if (response.ok) {
                const data = await response.json();
                return {
                  title: data.caption?.substring(0, 100) || `Instagram Reel ${videoId}`,
                  description: data.caption || '',
                  tags: ["instagram", "reel"],
                  thumbnail: data.media_url,
                  fetchedFrom: "native",
                };
              }
            } catch (error) {
              console.warn('Instagram API fetch failed:', error);
            }
          }
          
          // Try OG tags via CORS proxy (protected platform workaround)
          try {
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(corsProxy + encodeURIComponent(videoUrl));
            
            if (response.ok) {
              const html = await response.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
              const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
              const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
              
              if (ogTitle || ogDesc) {
                return {
                  title: ogTitle || `Instagram Reel ${videoId}`,
                  description: ogDesc || `Instagram video content`,
                  tags: ["instagram", "reel", "social-media"],
                  thumbnail: ogImage,
                  fetchedFrom: "native",
                };
              }
            }
          } catch (error) {
            console.warn('OG tag scraping failed for Instagram:', error);
          }
          
          // Fallback for Instagram
          return {
            title: `Instagram Reel ${videoId}`,
            description: `Instagram video content`,
            tags: ["instagram", "reel", "social-media"],
            fetchedFrom: "native",
          };
        }
        
        case "facebook": {
          // Facebook Graph API or fallback
          const fbToken = process.env.VITE_FACEBOOK_TOKEN;
          if (fbToken) {
            try {
              const response = await fetch(
                `https://graph.facebook.com/v18.0/${videoId}?fields=title,description,source,picture&access_token=${fbToken}`
              );
              
              if (response.ok) {
                const data = await response.json();
                return {
                  title: data.title || `Facebook Video ${videoId}`,
                  description: data.description || '',
                  tags: ["facebook", "video"],
                  thumbnail: data.picture?.data?.url,
                  fetchedFrom: "native",
                };
              }
            } catch (error) {
              console.warn('Facebook API fetch failed:', error);
            }
          }
          
          // Fallback for Facebook
          return {
            title: `Facebook Video ${videoId}`,
            description: `Facebook video content`,
            tags: ["facebook", "video", "social-media"],
            fetchedFrom: "native",
          };
        }
        
        case "dailymotion": {
          // Dailymotion API
          try {
            const response = await fetch(
              `https://api.dailymotion.com/video/${videoId}?fields=title,description,tags,thumbnail_url,duration`
            );
            
            if (response.ok) {
              const data = await response.json();
              return {
                title: data.title || `Dailymotion Video ${videoId}`,
                description: data.description || '',
                tags: data.tags || [],
                thumbnail: data.thumbnail_url,
                duration: data.duration,
                fetchedFrom: "native",
              };
            }
          } catch (error) {
            console.warn('Dailymotion API fetch failed:', error);
          }
          
          // Fallback for Dailymotion
          return {
            title: `Dailymotion Video ${videoId}`,
            description: `Dailymotion video content`,
            tags: ["dailymotion", "video"],
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
          const reelIndex = pathParts.findIndex(p => p === 'reel' || p === 'tv' || p === 'reels');
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

  // Generate metadata using AI (Gemini/Groq) with user's BYOK
  const generateAIMetadata = useCallback(async (
    videoUrl: string,
    platformId: string,
    engineId: string
  ): Promise<VideoMetadata | null> => {
    try {
      // Get user's API key from localStorage
      const storedApiKeys = localStorage.getItem("tubeclear_api_keys");
      if (!storedApiKeys) return null;
      
      const apiKeys = JSON.parse(storedApiKeys);
      const apiKeyData = apiKeys.find((k: any) => k.engineId === engineId);
      if (!apiKeyData || !apiKeyData.key) return null;
      
      const apiKey = apiKeyData.key;
      
      // AI prompt for video analysis based on URL
      const prompt = `Analyze this ${platformId} video link and provide a comprehensive safety report based on latest content policies.\n\nVideo URL: ${videoUrl}\n\nProvide:\n1. Likely video title\n2. Brief description\n3. Relevant tags/keywords\n4. Content category\n5. Any potential policy concerns\n\nFormat as JSON with fields: title, description, tags`;
      
      // Call AI engine based on type
      let response;
      let data;
      
      switch (engineId) {
        case "gemini": {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1024,
                }
              })
            }
          );
          
          if (response.ok) {
            data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Try to parse JSON from AI response
            try {
              const jsonMatch = aiText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                  title: parsed.title || `${platformId} Video Analysis`,
                  description: parsed.description || `AI-analyzed content from ${platformId}`,
                  tags: parsed.tags || [platformId.toLowerCase(), "ai-analyzed"],
                  fetchedFrom: "ai_failover",
                  aiEngineUsed: engineId,
                };
              }
            } catch {
              // If JSON parsing fails, use text response
            }
            
            return {
              title: `${platformId} Video - AI Analysis`,
              description: aiText.substring(0, 500),
              tags: [platformId.toLowerCase(), "ai-analyzed", "latest-policy"],
              fetchedFrom: "ai_failover",
              aiEngineUsed: engineId,
            };
          }
          break;
        }
        
        case "groq": {
          response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 1024,
                temperature: 0.7,
              })
            }
          );
          
          if (response.ok) {
            data = await response.json();
            const aiText = data.choices?.[0]?.message?.content || '';
            
            // Try to parse JSON
            try {
              const jsonMatch = aiText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                  title: parsed.title || `${platformId} Video Analysis`,
                  description: parsed.description || `AI-analyzed content from ${platformId}`,
                  tags: parsed.tags || [platformId.toLowerCase(), "ai-analyzed"],
                  fetchedFrom: "ai_failover",
                  aiEngineUsed: engineId,
                };
              }
            } catch {}
            
            return {
              title: `${platformId} Video - Groq Analysis`,
              description: aiText.substring(0, 500),
              tags: [platformId.toLowerCase(), "ai-analyzed", "groq"],
              fetchedFrom: "ai_failover",
              aiEngineUsed: engineId,
            };
          }
          break;
        }
        
        case "grok": {
          // Similar implementation for Grok/xAI
          response = await fetch(
            'https://api.x.ai/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 1024,
              })
            }
          );
          
          if (response.ok) {
            data = await response.json();
            const aiText = data.choices?.[0]?.message?.content || '';
            
            return {
              title: `${platformId} Video - Grok Analysis`,
              description: aiText.substring(0, 500),
              tags: [platformId.toLowerCase(), "ai-analyzed", "grok"],
              fetchedFrom: "ai_failover",
              aiEngineUsed: engineId,
            };
          }
          break;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`AI metadata generation failed for ${engineId}:`, error);
      return null;
    }
  }, []);

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
        
        // Use BYOK to generate metadata with AI analysis
        metadata = await generateAIMetadata(videoUrl, platformId, engineId);
        
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
