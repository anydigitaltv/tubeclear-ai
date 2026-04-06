-- Migration: Add channel_url column and validation constraint to connected_platforms
-- Date: 2026-04-04
-- Description: Add channel_url column and ensure all URLs start with http:// or https://
-- IMPORTANT: Run FIX_CONNECTED_PLATFORMS_TABLE.sql first if table doesn't exist!

-- Step 1: Check if table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'connected_platforms'
  ) THEN
    RAISE EXCEPTION 'Table connected_platforms does not exist! Please run FIX_CONNECTED_PLATFORMS_TABLE.sql first.';
  END IF;
END $$;

-- Step 2: Add channel_url column if it doesn't exist
ALTER TABLE public.connected_platforms
ADD COLUMN IF NOT EXISTS channel_url TEXT;

-- Step 3: Populate channel_url from account_name for existing records
UPDATE public.connected_platforms
SET channel_url = 'https://' || account_name
WHERE channel_url IS NULL
  AND account_name NOT LIKE 'http://%'
  AND account_name NOT LIKE 'https://%';

-- Step 4: Drop existing constraint if exists
ALTER TABLE public.connected_platforms
DROP CONSTRAINT IF EXISTS ensure_valid_url;

-- Step 5: Add CHECK constraint to ensure valid URL format
ALTER TABLE public.connected_platforms
ADD CONSTRAINT ensure_valid_url 
CHECK (channel_url ~* '^https?://');

-- Step 6: Add comments
COMMENT ON COLUMN public.connected_platforms.channel_url IS 
'Stores the full channel/profile URL for the connected platform';

COMMENT ON CONSTRAINT ensure_valid_url ON public.connected_platforms IS 
'Ensures all platform URLs use proper HTTP/HTTPS protocol for security and consistency';
