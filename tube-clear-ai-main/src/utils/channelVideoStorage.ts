import { supabase } from "@/integrations/supabase/client";
import type { ChannelVideo } from "@/utils/channelVideoFetcher";
import type { ScanResult } from "@/utils/autoScanService";

export interface StoredVideo {
  id: string;
  user_id: string;
  video_id: string;
  platform_id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  views_count: number;
  published_at: string | null;
  risk_score: number | null;
  scan_result: any | null;
  channel_url: string | null;
  created_at: string;
}

const LOCAL_STORAGE_KEY = "tubeclear_channel_videos";

/**
 * Save videos to Supabase database
 */
export const saveVideosToDatabase = async (
  videos: Array<ChannelVideo & { riskScore?: number; scanResult?: ScanResult }>,
  userId: string
): Promise<boolean> => {
  try {
    const videosToInsert = videos.map(video => ({
      user_id: userId,
      video_id: video.videoId,
      platform_id: video.platformId,
      title: video.title,
      thumbnail_url: video.thumbnail || null,
      video_url: video.videoUrl || null,
      duration_seconds: video.durationSeconds,
      views_count: video.views,
      published_at: video.publishedAt,
      risk_score: video.riskScore || null,
      scan_result: video.scanResult || null,
      channel_url: video.channelUrl || null,
    }));

    // Use upsert to avoid duplicates
    const { error } = await (supabase as any)
      .from("channel_videos")
      .upsert(videosToInsert, {
        onConflict: "user_id,video_id,platform_id"
      });

    if (error) {
      console.error("Error saving videos to database:", error);
      throw error;
    }

    console.log(`✅ Saved ${videos.length} videos to Supabase`);
    return true;
  } catch (error) {
    console.error("Failed to save videos to database:", error);
    return false;
  }
};

/**
 * Load videos from Supabase database
 */
export const loadVideosFromDatabase = async (userId: string): Promise<StoredVideo[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("channel_videos")
      .select("*")
      .eq("user_id", userId)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading videos from database:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to load videos from database:", error);
    return [];
  }
};

/**
 * Save videos to localStorage (for guest mode)
 */
export const saveVideosToLocalStorage = (
  videos: Array<ChannelVideo & { riskScore?: number; scanResult?: ScanResult }>
): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(videos));
    console.log(`✅ Saved ${videos.length} videos to localStorage`);
  } catch (error) {
    console.error("Error saving videos to localStorage:", error);
  }
};

/**
 * Load videos from localStorage (for guest mode)
 */
export const loadVideosFromLocalStorage = (): Array<ChannelVideo & { riskScore?: number; scanResult?: ScanResult }> => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading videos from localStorage:", error);
    return [];
  }
};

/**
 * Clear all stored videos
 */
export const clearStoredVideos = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  console.log("✅ Cleared stored videos");
};
