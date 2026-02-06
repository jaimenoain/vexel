-- Migration: 0012_airlock_items.sql
-- Description: Create airlock_items table and associated types and security policies.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.airlock_status AS ENUM ('QUEUED', 'PROCESSING', 'REVIEW_NEEDED', 'READY_TO_COMMIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.traffic_light AS ENUM ('RED', 'YELLOW', 'GREEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table
CREATE TABLE IF NOT EXISTS public.airlock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    status public.airlock_status DEFAULT 'QUEUED',
    ai_payload JSONB DEFAULT '{}'::jsonb,
    confidence_score FLOAT,
    traffic_light public.traffic_light,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.airlock_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy
-- A user can only Select, Insert, Update, or Delete rows in airlock_items if they have a valid AccessGrant for the referenced asset_id.
DROP POLICY IF EXISTS "Authorized users can manage airlock items" ON public.airlock_items;

CREATE POLICY "Authorized users can manage airlock items" ON public.airlock_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE user_id = auth.uid()
            AND asset_id = airlock_items.asset_id
        )
    );
