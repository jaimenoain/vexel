-- Migration: 0024_governance_automation.sql
-- Description: Create governance_tasks table and automate task creation via trigger on ghost_entries.

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
-- Ensure the table exists with all necessary columns.
CREATE TABLE IF NOT EXISTS public.governance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status NOT NULL DEFAULT 'OPEN',
    priority public.task_priority NOT NULL DEFAULT 'MEDIUM',
    source_ghost_id UUID REFERENCES public.ghost_entries(id) ON DELETE SET NULL,
    action_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add Columns (Idempotent for existing table)
-- If the table existed without these columns, add them.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'governance_tasks' AND column_name = 'action_payload') THEN
        ALTER TABLE public.governance_tasks ADD COLUMN action_payload JSONB;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'governance_tasks' AND column_name = 'source_ghost_id') THEN
        ALTER TABLE public.governance_tasks ADD COLUMN source_ghost_id UUID REFERENCES public.ghost_entries(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.governance_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Drop existing policies to avoid conflicts and recreate them.

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

-- 6. Trigger Function
CREATE OR REPLACE FUNCTION create_governance_task_on_overdue_ghost()
RETURNS TRIGGER AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Only proceed if status changed to OVERDUE
    IF NEW.status = 'OVERDUE' AND OLD.status != 'OVERDUE' THEN

        -- Idempotency Check: Ensure no existing task for this ghost entry
        SELECT EXISTS (
            SELECT 1 FROM public.governance_tasks
            WHERE source_ghost_id = NEW.id
        ) INTO task_exists;

        IF NOT task_exists THEN
            INSERT INTO public.governance_tasks (
                asset_id,
                title,
                priority,
                action_payload,
                source_ghost_id,
                status
            ) VALUES (
                NEW.asset_id,
                'Missing Proof for ' || NEW.description,
                'CRITICAL',
                jsonb_build_object('type', 'UPLOAD_PROOF', 'ghost_id', NEW.id),
                NEW.id,
                'OPEN'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger
DROP TRIGGER IF EXISTS trigger_create_governance_task ON public.ghost_entries;
CREATE TRIGGER trigger_create_governance_task
    AFTER UPDATE OF status ON public.ghost_entries
    FOR EACH ROW
    EXECUTE FUNCTION create_governance_task_on_overdue_ghost();

-- 8. Update process_overdue_ghosts function (Refactor)
CREATE OR REPLACE FUNCTION process_overdue_ghosts()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    ghost_record RECORD;
BEGIN
    -- Iterate through PENDING ghost entries older than 60 days
    FOR ghost_record IN
        SELECT id FROM public.ghost_entries
        WHERE status = 'PENDING'
        AND expected_date < (CURRENT_DATE - INTERVAL '60 days')
        FOR UPDATE
    LOOP
        -- Update status to OVERDUE. The trigger will handle task creation.
        UPDATE public.ghost_entries
        SET status = 'OVERDUE',
            updated_at = NOW()
        WHERE id = ghost_record.id;

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;
