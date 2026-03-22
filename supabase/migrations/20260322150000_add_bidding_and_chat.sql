-- Upgrading projects table for fiat and razorpay
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS fiat_bounty_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    developer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bid_amount NUMERIC NOT NULL,
    proposal_text TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for bids
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers can insert their own bids" ON public.bids;
CREATE POLICY "Developers can insert their own bids" ON public.bids
    FOR INSERT WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developers can select their own bids" ON public.bids;
CREATE POLICY "Developers can select their own bids" ON public.bids
    FOR SELECT USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Clients can view bids on their projects" ON public.bids;
CREATE POLICY "Clients can view bids on their projects" ON public.bids
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = bids.project_id AND projects.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can update bids on their projects" ON public.bids;
CREATE POLICY "Clients can update bids on their projects" ON public.bids
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = bids.project_id AND projects.owner_id = auth.uid()
        )
    );

-- Create messages table for Real-Time Chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can insert messages" ON public.messages;
CREATE POLICY "Project members can insert messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = messages.project_id 
              AND (projects.owner_id = auth.uid() OR projects.developer_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Project members can select messages" ON public.messages;
CREATE POLICY "Project members can select messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = messages.project_id 
              AND (projects.owner_id = auth.uid() OR projects.developer_id = auth.uid())
        )
    );
