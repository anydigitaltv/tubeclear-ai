-- Migration: Remove URL validation constraint from connected_platforms
-- Date: 2026-04-04
-- Description: Rollback - Remove the ensure_valid_url CHECK constraint

-- Drop the CHECK constraint
ALTER TABLE public.connected_platforms
DROP CONSTRAINT IF EXISTS ensure_valid_url;

-- Remove the comment
COMMENT ON CONSTRAINT ensure_valid_url ON public.connected_platforms IS NULL;
