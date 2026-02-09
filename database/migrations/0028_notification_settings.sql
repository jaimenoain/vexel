-- Add notification_settings column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"airlock_ready": true, "governance_alert": true}';
