-- 002_add_api_keys.sql
-- Add API Keys column to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_keys JSONB 
DEFAULT '{"linkedin_li_at": null, "twitter_api_key": null, "twitter_api_secret": null, "twitter_access_token": null, "twitter_access_secret": null, "devto_api_key": null}'::jsonb;
