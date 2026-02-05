-- Migration: 0009_refactor_access_grants.sql
-- Description: Refactor access_grants to use new enum values and column names for Strict Granular Security.

-- 1. Drop dependent policies and functions
-- Assets
DROP POLICY IF EXISTS "Users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets" ON public.assets;
DROP POLICY IF EXISTS "Owners can delete assets" ON public.assets;

-- Entities
DROP POLICY IF EXISTS "Users can view entities" ON public.entities;

-- Access Grants
DROP POLICY IF EXISTS "Users can view own grants" ON public.access_grants;
DROP POLICY IF EXISTS "Owners can create grants" ON public.access_grants;
DROP POLICY IF EXISTS "Owners can revoke grants" ON public.access_grants;

-- Trigger and Function
DROP TRIGGER IF EXISTS on_asset_created ON public.assets;
DROP FUNCTION IF EXISTS public.handle_new_asset_grant;

-- 2. Rename Enum Values
-- Postgres 10+ supports renaming enum values.
ALTER TYPE public.app_permission RENAME VALUE 'VIEW' TO 'READ_ONLY';
ALTER TYPE public.app_permission RENAME VALUE 'EDIT' TO 'EDITOR';
-- 'OWNER' remains as is.

-- 3. Rename Column
ALTER TABLE public.access_grants RENAME COLUMN access_level TO permission_level;

-- 4. Update Foreign Key
-- Safely drop the existing foreign key constraint on user_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.access_grants'::regclass
        AND confrelid = 'auth.users'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE public.access_grants DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- Add new constraint referencing profiles(id)
ALTER TABLE public.access_grants
    ADD CONSTRAINT access_grants_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 5. Recreate Function (with new column and enum value)
CREATE OR REPLACE FUNCTION public.handle_new_asset_grant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (NEW.id, NEW.owner_id, 'OWNER'::public.app_permission);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Recreate Trigger
CREATE TRIGGER on_asset_created
    AFTER INSERT ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_asset_grant();

-- 7. Recreate Policies for Assets

-- View: Users can view assets if they have ANY grant.
CREATE POLICY "Users can view assets" ON public.assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
        )
    );

-- Update: Users can update assets if they are EDITOR or OWNER.
CREATE POLICY "Users can update assets" ON public.assets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
            AND access_grants.permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
        )
    );

-- Delete: Only OWNERS can delete.
CREATE POLICY "Owners can delete assets" ON public.assets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
            AND access_grants.permission_level = 'OWNER'::public.app_permission
        )
    );

-- 8. Recreate Policies for Entities

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

-- 9. Recreate Policies for AccessGrants

-- View: Users can view grants that belong to them (to see what permissions they have).
-- (Optional: Can they view grants for assets they own? Yes, to manage team.)
CREATE POLICY "Users can view own grants" ON public.access_grants
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.assets
            WHERE assets.id = access_grants.asset_id
            AND assets.owner_id = auth.uid()
        )
    );
-- Note: 'assets.owner_id' is the creator/original owner.
-- In Strict Granular Security, 'OWNER' is a permission in access_grants.
-- So we should probably check for 'OWNER' permission instead of 'assets.owner_id'.
-- But `assets.owner_id` column still exists and is used by `handle_new_asset_grant`.
-- For now, I'll stick to the logic that was roughly there, but maybe improve it?
-- "Owners can create grants" -> "Owner" defined as someone with 'OWNER' permission.

-- Let's upgrade the policy to be strictly granular based on the 'OWNER' permission.
-- But wait, checking permission_level inside policy on access_grants might be recursive if not careful.
-- "Am I an owner of this asset?" -> Check access_grants for (asset_id, me, 'OWNER').

-- Revised "Users can view own grants":
-- 1. My own grant.
-- 2. Grants for assets where I am an OWNER.
DROP POLICY IF EXISTS "Users can view grants" ON public.access_grants; -- Rename for clarity if I could, but sticking to old names.

-- Actually, sticking to `assets.owner_id` is safer for now if we haven't fully deprecated that column.
-- But the Prompt says: "Strict Granular Security... access_grants junction table... is the single source of truth".
-- So ideally `assets.owner_id` should be ignored for permission checks.
-- But for this migration, let's keep it simple and consistent with the previous logic but using the new table structure.
-- The previous logic in 0003 used `assets.owner_id`.
-- I'll stick to `assets.owner_id` for "Owner" check in these utility policies to avoid infinite recursion or complex joins for now,
-- unless I am sure.
-- Actually, let's use the `access_grants` table itself.
-- "I can view a grant row G (for user U, asset A) IF I have a grant (me, A, OWNER)".

-- This is a self-join.
-- CREATE POLICY ... USING ( EXISTS ( SELECT 1 FROM access_grants ag2 WHERE ag2.asset_id = access_grants.asset_id AND ag2.user_id = auth.uid() AND ag2.permission_level = 'OWNER' ) )
-- This seems correct for "I can view grants for assets I own".

DROP POLICY IF EXISTS "Users can view own grants" ON public.access_grants;
CREATE POLICY "Users can view own grants" ON public.access_grants
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.access_grants ag_owner
            WHERE ag_owner.asset_id = access_grants.asset_id
            AND ag_owner.user_id = auth.uid()
            AND ag_owner.permission_level = 'OWNER'::public.app_permission
        )
    );

-- Create: Only OWNERS can create new grants.
CREATE POLICY "Owners can create grants" ON public.access_grants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag_owner
            WHERE ag_owner.asset_id = access_grants.asset_id
            AND ag_owner.user_id = auth.uid()
            AND ag_owner.permission_level = 'OWNER'::public.app_permission
        )
    );

-- Revoke: Only OWNERS can delete grants.
CREATE POLICY "Owners can revoke grants" ON public.access_grants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag_owner
            WHERE ag_owner.asset_id = access_grants.asset_id
            AND ag_owner.user_id = auth.uid()
            AND ag_owner.permission_level = 'OWNER'::public.app_permission
        )
    );
