-- Connected platforms table for multi-platform dashboard
CREATE TABLE public.connected_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL CHECK (platform_id IN ('youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion')),
  account_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_id)
);

ALTER TABLE public.connected_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected platforms" ON public.connected_platforms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own connected platforms" ON public.connected_platforms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own connected platforms" ON public.connected_platforms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own connected platforms" ON public.connected_platforms FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_connected_platforms_user_id ON public.connected_platforms(user_id);
CREATE INDEX idx_connected_platforms_platform_id ON public.connected_platforms(platform_id);
