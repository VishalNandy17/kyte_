-- ============================================================
-- user_profiles: stores role and wallet for each auth user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('client', 'developer')),
    wallet_address text,
    display_name text,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own profile (only once)
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
CREATE POLICY "Users can create own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Developers can view basic info of clients for their projects (read-only)
DROP POLICY IF EXISTS "Developers can view client profiles by wallet" ON public.user_profiles;
CREATE POLICY "Developers can view client profiles by wallet"
ON public.user_profiles FOR SELECT
USING (true);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Update projects table: link to user_profiles ─────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects (owner_id);

-- RLS: Clients can only see their own projects
-- Developers can see all OPEN projects
DROP POLICY IF EXISTS "Allow public read access to projects" ON public.projects;

DROP POLICY IF EXISTS "Clients can manage own projects" ON public.projects;
CREATE POLICY "Clients can manage own projects"
ON public.projects FOR ALL
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Developers can view open projects" ON public.projects;
CREATE POLICY "Developers can view open projects"
ON public.projects FOR SELECT
USING (status = 'OPEN');
