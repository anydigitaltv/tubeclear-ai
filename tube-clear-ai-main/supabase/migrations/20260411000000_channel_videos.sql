-- Channel Videos table for automatic video sync
-- Created: 2026-04-11
-- Purpose: Store fetched channel videos with scan results

CREATE TABLE public.channel_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  platform_id TEXT NOT NULL CHECK (platform_id IN ('youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion')),
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT,
  duration_seconds INTEGER,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  risk_score INTEGER,
  scan_result JSONB,
  channel_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id, platform_id)
);

ALTER TABLE public.channel_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own channel videos" 
  ON public.channel_videos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channel videos" 
  ON public.channel_videos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channel videos" 
  ON public.channel_videos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channel videos" 
  ON public.channel_videos FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_channel_videos_user_id ON public.channel_videos(user_id);
CREATE INDEX idx_channel_videos_platform_id ON public.channel_videos(platform_id);
CREATE INDEX idx_channel_videos_published_at ON public.channel_videos(published_at DESC);
CREATE INDEX idx_channel_videos_video_id ON public.channel_videos(video_id);
