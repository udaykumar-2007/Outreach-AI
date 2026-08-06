-- 003_add_devto_channel.sql
-- Add 'devto' to the platform check constraints

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_platform_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_platform_check CHECK (platform IN ('linkedin', 'twitter', 'upwork', 'devto'));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_platform_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_platform_check CHECK (platform IN ('linkedin', 'twitter', 'upwork', 'devto'));
