-- Migration: Add URL validation constraint to connected_platforms
-- Date: 2026-04-04
-- Description: Ensure all channel_url values start with http:// or https://

-- Add CHECK constraint to ensure valid URL format
ALTER TABLE public.connected_platforms
ADD CONSTRAINT ensure_valid_url 
CHECK (channel_url ~* '^https?://');

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT ensure_valid_url ON public.connected_platforms IS 
'Ensures all platform URLs use proper HTTP/HTTPS protocol for security and consistency';
