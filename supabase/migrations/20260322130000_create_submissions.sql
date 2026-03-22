-- ============================================================
-- submissions: tracks each developer's work per project
-- ============================================================

CREATE TABLE IF NOT EXISTS public.submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    developer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    developer_email text,
    github_url text NOT NULL,
    score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    passed boolean NOT NULL DEFAULT false,
    evaluation_result jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions (project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_developer_id ON public.submissions (developer_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Developer can insert their own submissions
DROP POLICY IF EXISTS "Developers can insert own submissions" ON public.submissions;
CREATE POLICY "Developers can insert own submissions"
ON public.submissions FOR INSERT
WITH CHECK (auth.uid() = developer_id);

-- Developer can read their own submissions
DROP POLICY IF EXISTS "Developers can read own submissions" ON public.submissions;
CREATE POLICY "Developers can read own submissions"
ON public.submissions FOR SELECT
USING (auth.uid() = developer_id);

-- Client can read all submissions for their own projects
DROP POLICY IF EXISTS "Clients can read submissions for owned projects" ON public.submissions;
CREATE POLICY "Clients can read submissions for owned projects"
ON public.submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = submissions.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- ── Add developer tracking columns to projects ─────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS developer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS developer_email text,
  ADD COLUMN IF NOT EXISTS submission_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_score integer NOT NULL DEFAULT 0;
