-- Migration: 0017_ghost_entries.sql
-- Description: Create ghost_entries table and ghost_status enum with RLS policies mirroring ledger_transactions logic.

-- 1. Enum: ghost_status
DO $$ BEGIN
    CREATE TYPE public.ghost_status AS ENUM ('PENDING', 'MATCHED', 'OVERDUE', 'VOIDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: ghost_entries
CREATE TABLE IF NOT EXISTS public.ghost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id),
    expected_date DATE NOT NULL,
    expected_amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    recurrence_rule TEXT,
    status public.ghost_status NOT NULL DEFAULT 'PENDING'
);

-- 3. Enable RLS
ALTER TABLE public.ghost_entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: Users can view ghost entries if they have a grant for the asset.
DROP POLICY IF EXISTS "Users can view ghost entries" ON public.ghost_entries;
CREATE POLICY "Users can view ghost entries" ON public.ghost_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = ghost_entries.asset_id
            AND ag.user_id = auth.uid()
        )
    );

-- INSERT: Users can insert ghost entries if they have EDITOR/OWNER permission on the asset.
DROP POLICY IF EXISTS "Users can insert ghost entries" ON public.ghost_entries;
CREATE POLICY "Users can insert ghost entries" ON public.ghost_entries
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );

-- UPDATE: Users can update ghost entries if they have EDITOR/OWNER permission on the asset.
DROP POLICY IF EXISTS "Users can update ghost entries" ON public.ghost_entries;
CREATE POLICY "Users can update ghost entries" ON public.ghost_entries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = ghost_entries.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );

-- DELETE: Users can delete ghost entries if they have EDITOR/OWNER permission on the asset.
DROP POLICY IF EXISTS "Users can delete ghost entries" ON public.ghost_entries;
CREATE POLICY "Users can delete ghost entries" ON public.ghost_entries
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = ghost_entries.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );
