-- Add avatar_url and email to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email text;
