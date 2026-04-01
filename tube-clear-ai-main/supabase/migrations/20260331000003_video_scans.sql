-- Video Scans table for storing scan results
CREATE TABLE public.video_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  scan_result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video scans" ON public.video_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own video scans" ON public.video_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_video_scans_user_id ON public.video_scans(user_id);
CREATE INDEX idx_video_scans_video_id ON public.video_scans(video_id);
CREATE INDEX idx_video_scans_platform_id ON public.video_scans(platform_id);
CREATE INDEX idx_video_scans_created_at ON public.video_scans(created_at DESC);
