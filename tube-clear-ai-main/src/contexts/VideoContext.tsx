import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { usePlatforms, type PlatformId } from "@/contexts/PlatformContext";

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

// Mock video data generator (replace with actual API calls later)
const generateMockVideos = (platformId: PlatformId): Video[] => {
  const videoTemplates = [
    { title: "How to Grow Your Channel Fast", views: 125000, likes: 5400, comments: 234, duration: "12:34", durationSeconds: 754 },
    { title: "Best Editing Tips for Beginners", views: 89000, likes: 3200, comments: 156, duration: "8:45", durationSeconds: 525 },
    { title: "Content Strategy That Works", views: 234000, likes: 8900, comments: 567, duration: "15:20", durationSeconds: 920 },
    { title: "Monetization Guide 2024", views: 456000, likes: 12000, comments: 890, duration: "20:15", durationSeconds: 1215 },
    { title: "Thumbnail Secrets Revealed", views: 178000, likes: 6700, comments: 345, duration: "9:30", durationSeconds: 570 },
    { title: "Algorithm Hacks You Need", views: 567000, likes: 15000, comments: 1023, duration: "18:45", durationSeconds: 1125 },
    { title: "Viral Video Formula", views: 789000, likes: 23000, comments: 1567, duration: "14:22", durationSeconds: 862 },
    { title: "Analytics Deep Dive", views: 92000, likes: 4100, comments: 189, duration: "11:55", durationSeconds: 715 },
    // Add some Shorts
    { title: "Quick Tip #shorts", views: 1200000, likes: 45000, comments: 890, duration: "0:45", durationSeconds: 45 },
    { title: "Behind the Scenes #shorts", views: 890000, likes: 34000, comments: 567, duration: "0:58", durationSeconds: 58 },
  ];

  return videoTemplates.map((template, index) => ({
    id: `${platformId}-${index}-${Date.now()}`,
    platformId,
    title: template.title,
    thumbnail: `https://picsum.photos/seed/${platformId}${index}/320/180`,
    views: template.views,
    likes: template.likes,
    comments: template.comments,
    duration: template.duration,
    durationSeconds: template.durationSeconds,
    publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    riskScore: Math.floor(Math.random() * 100),
  }));
};

export const VideoProvider = ({ children }: { children: ReactNode }) => {
  const { platforms } = usePlatforms();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Load videos from localStorage on mount
  useEffect(() => {
    const loadStoredVideos = () => {
      try {
        const stored = localStorage.getItem(VIDEO_STORAGE_KEY);
        const syncTime = localStorage.getItem(VIDEO_SYNC_KEY);
        
        if (stored) {
          setVideos(JSON.parse(stored));
        }
        if (syncTime) {
          setLastSynced(new Date(syncTime));
        }
      } catch (error) {
        console.error("Error loading stored videos:", error);
      }
    };

    loadStoredVideos();
  }, []);

  // Lazy refresh: Only sync on app open (when connected platforms change)
  useEffect(() => {
    const connectedPlatforms = platforms.filter(p => p.connected);
    if (connectedPlatforms.length > 0 && videos.length === 0) {
      refreshVideos();
    }
  }, [platforms]);

  const refreshVideos = useCallback(async () => {
    setIsLoading(true);
    
    const connectedPlatforms = platforms.filter(p => p.connected);
    const allVideos: Video[] = [];

    // Fetch videos for each connected platform
    for (const platform of connectedPlatforms) {
      // Mock data - replace with actual API call
      const platformVideos = generateMockVideos(platform.id);
      allVideos.push(...platformVideos);
    }

    setVideos(allVideos);
    const now = new Date();
    setLastSynced(now);
    
    // Store in localStorage
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(allVideos));
    localStorage.setItem(VIDEO_SYNC_KEY, now.toISOString());
    
    setIsLoading(false);
  }, [platforms]);

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
