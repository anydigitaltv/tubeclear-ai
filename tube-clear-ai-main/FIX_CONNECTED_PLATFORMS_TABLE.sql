-- Complete Fix for connected_platforms Table
-- Run this in Supabase SQL Editor to fix "could not find table" error
-- Date: 2026-04-04

-- Step 1: Drop table if exists (to start fresh)
DROP TABLE IF EXISTS public.connected_platforms CASCADE;

-- Step 2: Recreate the table with all columns
CREATE TABLE public.connected_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL CHECK (platform_id IN ('youtube', 'tiktok', 'instagram', 'facebook', 'dailymotion')),
  account_name TEXT NOT NULL,
  channel_url TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_id)
);

-- Step 3: Enable Row Level Security
ALTER TABLE public.connected_platforms ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own connected platforms" ON public.connected_platforms;
DROP POLICY IF EXISTS "Users can insert their own connected platforms" ON public.connected_platforms;
DROP POLICY IF EXISTS "Users can update their own connected platforms" ON public.connected_platforms;
DROP POLICY IF EXISTS "Users can delete their own connected platforms" ON public.connected_platforms;

CREATE POLICY "Users can view their own connected platforms" 
  ON public.connected_platforms 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected platforms" 
  ON public.connected_platforms 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected platforms" 
  ON public.connected_platforms 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected platforms" 
  ON public.connected_platforms 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Step 5: Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_platforms_user_id 
  ON public.connected_platforms(user_id);

CREATE INDEX IF NOT EXISTS idx_connected_platforms_platform_id 
  ON public.connected_platforms(platform_id);

-- Step 6: Add URL validation constraint
ALTER TABLE public.connected_platforms
ADD CONSTRAINT ensure_valid_url 
CHECK (channel_url ~* '^https?://');

-- Step 7: Add helpful comments
COMMENT ON TABLE public.connected_platforms IS 
'Stores user-connected social media platforms for multi-platform dashboard';

COMMENT ON COLUMN public.connected_platforms.channel_url IS 
'Stores the full channel/profile URL for the connected platform';

COMMENT ON CONSTRAINT ensure_valid_url ON public.connected_platforms IS 
'Ensures all platform URLs use proper HTTP/HTTPS protocol';

-- Step 8: Verify table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'connected_platforms'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ connected_platforms table created successfully!' AS status;
