-- Migration: 0019_governance_tasks.sql
-- Description: Create governance_tasks table and related enums for Overdue Monitor.

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('OPEN', 'RESOLVED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: governance_tasks
CREATE TABLE IF NOT EXISTS public.governance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status NOT NULL DEFAULT 'OPEN',
    priority public.task_priority NOT NULL DEFAULT 'MEDIUM',
    source_ghost_id UUID REFERENCES public.ghost_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.governance_tasks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: Users can view tasks if they have ANY access grant on the asset.
DROP POLICY IF EXISTS "Users can view governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can view governance tasks" ON public.governance_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
        )
    );

-- INSERT: Users can create tasks if they have EDITOR or OWNER access grant on the asset.
DROP POLICY IF EXISTS "Users can create governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can create governance tasks" ON public.governance_tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );

-- UPDATE: Users can update tasks if they have ANY access grant on the asset (as per "see/edit" requirement).
-- Note: Typically edit requires higher privilege, but requirement is explicit about "existing Access Grant".
DROP POLICY IF EXISTS "Users can update governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can update governance tasks" ON public.governance_tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
        )
    );

-- DELETE: Users can delete tasks if they have EDITOR or OWNER access grant on the asset.
-- (Optional, but good for cleanup/management)
DROP POLICY IF EXISTS "Users can delete governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can delete governance tasks" ON public.governance_tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );
