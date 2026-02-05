-- Migration: 0008_strict_granular_security_policies.sql
-- Description: Implement Strict Granular Security model (RLS) for Entities and Assets.

-- 1. Trigger Function for Zero Orphans
-- Ensures that when an asset is created, the creator is immediately granted 'OWNER' access.
CREATE OR REPLACE FUNCTION public.handle_new_asset_grant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.access_grants (asset_id, user_id, access_level)
    VALUES (NEW.id, NEW.owner_id, 'OWNER'::public.app_permission);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS on_asset_created ON public.assets;
CREATE TRIGGER on_asset_created
    AFTER INSERT ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_asset_grant();

-- 4. RLS on Assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets" ON public.assets;
DROP POLICY IF EXISTS "Owners can delete assets" ON public.assets;

-- Policy 1 (Select): Strict Granular Security - Must have a grant.
CREATE POLICY "Users can view assets" ON public.assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
        )
    );

-- Policy 2 (Insert): Creator must be owner. Trigger handles the grant creation.
CREATE POLICY "Users can create assets" ON public.assets
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy 3 (Update): Must have EDIT or OWNER permission.
CREATE POLICY "Users can update assets" ON public.assets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
            AND access_grants.access_level IN ('EDIT'::public.app_permission, 'OWNER'::public.app_permission)
        )
    );

-- Policy 4 (Delete): Must be OWNER.
CREATE POLICY "Owners can delete assets" ON public.assets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
            AND access_grants.access_level = 'OWNER'::public.app_permission
        )
    );

-- 5. RLS on Entities
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view entities" ON public.entities;

-- Entity Visibility: Visible if user has access to AT LEAST ONE asset in it.
CREATE POLICY "Users can view entities" ON public.entities
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assets
            JOIN public.access_grants ON assets.id = access_grants.asset_id
            WHERE assets.entity_id = entities.id
            AND access_grants.user_id = auth.uid()
        )
    );
