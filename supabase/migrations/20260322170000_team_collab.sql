-- Add github_repo_url to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

-- Project Teams Table
CREATE TABLE IF NOT EXISTS public.project_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    developer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('LEAD', 'MEMBER')) DEFAULT 'MEMBER',
    github_handle TEXT,
    status TEXT CHECK (status IN ('PENDING_CLIENT_APPROVAL', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING_CLIENT_APPROVAL',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, developer_id)
);

ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- Project Teams RLS
-- Developers can view teams for projects they are invited to or are a part of
CREATE POLICY "Developers can view their own teams" ON public.project_teams
    FOR SELECT USING (developer_id = auth.uid());

-- Lead developers can invite others
-- We must make sure the inviting developer is the LEAD for the project.
CREATE POLICY "Lead devs can insert team members" ON public.project_teams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_teams pt 
            WHERE pt.project_id = project_teams.project_id 
              AND pt.developer_id = auth.uid() 
              AND pt.role = 'LEAD'
        ) 
        -- Also if the project was just created, the backend will insert the LEAD record using service_role
    );

-- Clients can view teams for their own projects
CREATE POLICY "Clients can view teams on their projects" ON public.project_teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_teams.project_id AND p.owner_id = auth.uid()
        )
    );

-- Clients can update team status (APPROVE/REJECT)
CREATE POLICY "Clients can update team status" ON public.project_teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_teams.project_id AND p.owner_id = auth.uid()
        )
    );


-- Work Logs Table
CREATE TABLE IF NOT EXISTS public.work_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    developer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hours_logged NUMERIC DEFAULT 0,
    description TEXT NOT NULL,
    log_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Work Logs RLS
-- Developers can view and insert their own logs
CREATE POLICY "Developers can view their logs" ON public.work_logs
    FOR SELECT USING (developer_id = auth.uid());

CREATE POLICY "Developers can insert their logs" ON public.work_logs
    FOR INSERT WITH CHECK (
        developer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.project_teams pt
            WHERE pt.project_id = work_logs.project_id 
              AND pt.developer_id = auth.uid()
              AND pt.status = 'APPROVED'
        )
    );

-- Clients can view logs for their own projects
CREATE POLICY "Clients can view project logs" ON public.work_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = work_logs.project_id AND p.owner_id = auth.uid()
        )
    );

-- Lead developers can view logs of all developers on their project
CREATE POLICY "Lead devs can view all project logs" ON public.work_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_teams pt
            WHERE pt.project_id = work_logs.project_id
              AND pt.developer_id = auth.uid()
              AND pt.role = 'LEAD'
        )
    );
