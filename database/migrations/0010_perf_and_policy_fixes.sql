-- Migration: 0010_perf_and_policy_fixes.sql
-- Description: Add missing indices for performance and enable grant updates for owners.

-- 1. Performance Indices
-- Accelerate entity visibility check which joins assets on entity_id
CREATE INDEX IF NOT EXISTS idx_assets_entity_id ON public.assets(entity_id);

-- Accelerate grant checks which filter by user_id
CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON public.access_grants(user_id);

-- 2. Update Policy for Access Grants
-- Allow Owners to update permission levels (e.g. READ_ONLY -> EDITOR) for their assets.
-- Existing policies cover INSERT (Create) and DELETE (Revoke), but UPDATE was missing.

DROP POLICY IF EXISTS "Owners can update grants" ON public.access_grants;

CREATE POLICY "Owners can update grants" ON public.access_grants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag_owner
            WHERE ag_owner.asset_id = access_grants.asset_id
            AND ag_owner.user_id = auth.uid()
            AND ag_owner.permission_level = 'OWNER'::public.app_permission
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag_owner
            WHERE ag_owner.asset_id = access_grants.asset_id
            AND ag_owner.user_id = auth.uid()
            AND ag_owner.permission_level = 'OWNER'::public.app_permission
        )
    );
