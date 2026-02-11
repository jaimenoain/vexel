-- Migration: 0035_manual_governance_tasks.sql
-- Description: Update governance_tasks to support manual creation (nullable asset, due_date, user_id).

-- 1. Add columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'governance_tasks' AND column_name = 'due_date') THEN
        ALTER TABLE public.governance_tasks ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'governance_tasks' AND column_name = 'user_id') THEN
        ALTER TABLE public.governance_tasks ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Make asset_id nullable
ALTER TABLE public.governance_tasks ALTER COLUMN asset_id DROP NOT NULL;

-- 3. Update RLS Policies
-- We need to allow access if:
-- a) The user is the owner (user_id = auth.uid())
-- b) The task is linked to an asset the user has access to (via access_grants)

DROP POLICY IF EXISTS "Users can view governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can view governance tasks" ON public.governance_tasks
    FOR SELECT
    USING (
        (user_id = auth.uid()) OR
        (asset_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Users can create governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can create governance tasks" ON public.governance_tasks
    FOR INSERT
    WITH CHECK (
        -- User can create tasks for themselves (if user_id matches)
        (user_id = auth.uid()) OR
        -- Or for an asset they have edit access to
        (asset_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        ))
    );

DROP POLICY IF EXISTS "Users can update governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can update governance tasks" ON public.governance_tasks
    FOR UPDATE
    USING (
        (user_id = auth.uid()) OR
        (asset_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Users can delete governance tasks" ON public.governance_tasks;
CREATE POLICY "Users can delete governance tasks" ON public.governance_tasks
    FOR DELETE
    USING (
        (user_id = auth.uid()) OR
        (asset_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = governance_tasks.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        ))
    );
