-- Migration: Add channel_url column and validation constraint to connected_platforms
-- Date: 2026-04-04
-- Description: Add channel_url column and ensure all URLs start with http:// or https://

-- Step 1: Add channel_url column if it doesn't exist
ALTER TABLE public.connected_platforms
ADD COLUMN IF NOT EXISTS channel_url TEXT;

-- Step 2: Populate channel_url from account_name for existing records
UPDATE public.connected_platforms
SET channel_url = 'https://' || account_name
WHERE channel_url IS NULL
  AND account_name NOT LIKE 'http://%'
  AND account_name NOT LIKE 'https://%';

-- Step 3: Add CHECK constraint to ensure valid URL format
ALTER TABLE public.connected_platforms
ADD CONSTRAINT ensure_valid_url 
CHECK (channel_url ~* '^https?://');

-- Step 4: Add comment to explain the constraint
COMMENT ON COLUMN public.connected_platforms.channel_url IS 
'Stores the full channel/profile URL for the connected platform';

COMMENT ON CONSTRAINT ensure_valid_url ON public.connected_platforms IS 
'Ensures all platform URLs use proper HTTP/HTTPS protocol for security and consistency';
