import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { usePlatforms, type PlatformId } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChannelVideos, type ChannelVideo } from "@/utils/channelVideoFetcher";
import { autoScanVideo, type ScanResult } from "@/utils/autoScanService";
import { syncAndScanPlatformVideos, type ScanStatus } from "@/utils/syncAndScanService";
import { 
  saveVideosToDatabase, 
  loadVideosFromDatabase,
  saveVideosToLocalStorage,
  loadVideosFromLocalStorage
} from "@/utils/channelVideoStorage";

export interface Video {
  id: string;
  platformId: PlatformId;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  duration: string; // Display format (e.g., "12:34")
  durationSeconds?: number; // For pricing calculation
  riskScore?: number;
  scanResult?: ScanResult;
  videoUrl?: string;
}

interface VideoContextType {
  videos: Video[];
  isLoading: boolean;
  lastSynced: Date | null;
  refreshVideos: () => Promise<void>;
  getVideosByPlatform: (platformId: PlatformId) => Video[];
}

const VIDEO_STORAGE_KEY = "tubeclear_videos";
const VIDEO_SYNC_KEY = "tubeclear_last_sync";

const VideoContext = createContext<VideoContextType | undefined>(undefined);

// Convert ChannelVideo to Video format
const channelVideoToVideo = (channelVideo: ChannelVideo & { riskScore?: number; scanResult?: ScanResult }): Video => {
  const minutes = Math.floor(channelVideo.durationSeconds / 60);
  const seconds = channelVideo.durationSeconds % 60;
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
    id: channelVideo.videoId,
    platformId: channelVideo.platformId,
    title: channelVideo.title,
    thumbnail: channelVideo.thumbnail,
    views: channelVideo.views,
    likes: Math.floor(channelVideo.views * 0.045), // Approximate 4.5% like rate
    comments: Math.floor(channelVideo.views * 0.008), // Approximate 0.8% comment rate
    publishedAt: channelVideo.publishedAt,
    duration,
    durationSeconds: channelVideo.durationSeconds,
    riskScore: channelVideo.riskScore,
    scanResult: channelVideo.scanResult,
    videoUrl: channelVideo.videoUrl,
  };
};

export const VideoProvider = ({ children }: { children: ReactNode }) => {
  const { platforms } = usePlatforms();
  const { user, isGuest } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Load videos from database/localStorage on mount
  useEffect(() => {
    const loadStoredVideos = async () => {
      try {
        if (!isGuest && user) {
          // Load from Supabase for authenticated users
          const dbVideos = await loadVideosFromDatabase(user.id);
          if (dbVideos.length > 0) {
            const convertedVideos = dbVideos.map((dbVideo: any) => ({
              id: dbVideo.video_id,
              platformId: dbVideo.platform_id as PlatformId,
              title: dbVideo.title,
              thumbnail: dbVideo.thumbnail_url || '',
              views: dbVideo.views_count || 0,
              likes: Math.floor((dbVideo.views_count || 0) * 0.045),
              comments: Math.floor((dbVideo.views_count || 0) * 0.008),
              publishedAt: dbVideo.published_at || new Date().toISOString(),
              duration: `${Math.floor((dbVideo.duration_seconds || 0) / 60)}:${(dbVideo.duration_seconds % 60).toString().padStart(2, '0')}`,
              durationSeconds: dbVideo.duration_seconds,
              riskScore: dbVideo.risk_score,
              scanResult: dbVideo.scan_result,
              videoUrl: dbVideo.video_url,
            }));
            setVideos(convertedVideos);
          }
        } else {
          // Load from localStorage for guests
          const localVideos = loadVideosFromLocalStorage();
          if (localVideos.length > 0) {
            setVideos(localVideos.map(channelVideoToVideo));
          }
        }

        // Load sync time
        const syncTime = localStorage.getItem(VIDEO_SYNC_KEY);
        if (syncTime) {
          setLastSynced(new Date(syncTime));
        }
      } catch (error) {
        console.error("Error loading stored videos:", error);
      }
    };

    loadStoredVideos();
  }, [user, isGuest]);

  const refreshVideos = useCallback(async () => {
    setIsLoading(true);
    console.log('🚀 Starting video sync and auto-scan...');
    
    // Clear old videos before fetching new ones
    setVideos([]);
    
    const connectedPlatforms = platforms.filter(p => p.connected);
    const allChannelVideos: Array<ChannelVideo & { riskScore?: number; scanResult?: ScanResult }> = [];

    // Fetch and scan videos for each connected platform
    for (const platform of connectedPlatforms) {
      try {
        const channelUrl = platform.accountName || '';
        console.log(`📺 Fetching videos from ${platform.name}...`);
        
        // TODO: Replace fetchChannelVideos with real platform API calls
        // YouTube: Use YouTube Data API v3 (search.list or playlistItems)
        // TikTok: Use TikTok API for Business
        // Instagram: Use Instagram Graph API
        // Facebook: Use Facebook Graph API
        // Dailymotion: Use Dailymotion API
        // For now, using simulated data
        const channelVideos = await fetchChannelVideos(platform.id, channelUrl);
        console.log(`✅ Fetched ${channelVideos.length} videos from ${platform.name}`);
        
        // Step 2: Use the new syncAndScanPlatformVideos service
        await syncAndScanPlatformVideos(
          platform.id,
          channelUrl,
          channelVideos,
          user?.id,
          isGuest,
          (videoId: string, status: ScanStatus, result?: ScanResult) => {
            // Status update callback
            console.log(`📊 Video ${videoId} status: ${status}`, result ? `Risk: ${result.riskScore}%` : '');
            
            // Update UI if needed (real-time updates)
            if (status === 'completed' && result) {
              setVideos(prev => 
                prev.map(v => 
                  v.id === videoId 
                    ? { ...v, riskScore: result.riskScore, scanResult: result }
                    : v
                )
              );
            }
          }
        );
        
        // Collect all videos for state update (they've been updated by syncAndScanPlatformVideos)
        const videosWithScan = channelVideos.map(vid => ({
          ...vid,
        })) as Array<ChannelVideo & { riskScore?: number; scanResult?: ScanResult }>;
        
        allChannelVideos.push(...videosWithScan);
        console.log(`✅ Processed all videos from ${platform.name}`);
        
      } catch (error) {
        console.error(`Error fetching videos from ${platform.name}:`, error);
      }
    }

    // Convert to Video format
    const convertedVideos = allChannelVideos.map(channelVideoToVideo);
    
    setVideos(convertedVideos);
    const now = new Date();
    setLastSynced(now);
    
    // Store sync time
    localStorage.setItem(VIDEO_SYNC_KEY, now.toISOString());
    
    console.log(`✅ Video sync and scan complete! Total videos: ${convertedVideos.length}`);
    setIsLoading(false);
  }, [platforms, user, isGuest]);

  // Auto-sync when platforms change
  useEffect(() => {
    const connectedPlatforms = platforms.filter(p => p.connected);
    
    // Clear videos if no platforms connected
    if (connectedPlatforms.length === 0 && videos.length > 0) {
      console.log('🗑️ No platforms connected, clearing videos');
      setVideos([]);
      setLastSynced(null);
      localStorage.removeItem(VIDEO_SYNC_KEY);
      return;
    }
    
    // Trigger sync only if we have connected platforms and no videos loaded yet
    if (connectedPlatforms.length > 0 && videos.length === 0) {
      console.log('🔄 Platform connected, triggering initial video sync...');
      refreshVideos();
    }
  }, [platforms, videos.length, refreshVideos]);

  // Listen for platform connection events
  useEffect(() => {
    const handlePlatformConnected = () => {
      console.log('🔄 Platform connected event received, clearing old videos and triggering sync...');
      // Clear old videos immediately
      setVideos([]);
      // Then trigger fresh sync
      refreshVideos();
    };

    window.addEventListener('platform-connected', handlePlatformConnected as EventListener);
    
    return () => {
      window.removeEventListener('platform-connected', handlePlatformConnected as EventListener);
    };
  }, [refreshVideos]);

  const getVideosByPlatform = useCallback((platformId: PlatformId) => {
    return videos.filter(v => v.platformId === platformId);
  }, [videos]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        isLoading,
        lastSynced,
        refreshVideos,
        getVideosByPlatform,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideos = () => {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideos must be used within VideoProvider");
  return ctx;
};
