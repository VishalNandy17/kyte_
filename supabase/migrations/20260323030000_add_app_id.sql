-- Add app_id to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS app_id bigint;
