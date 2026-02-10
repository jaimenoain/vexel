-- Migration: 0031_fix_access_grants_recursion.sql
-- Description: Fix infinite recursion in access_grants RLS policies by using a SECURITY DEFINER function.

-- 1. Create a function to check ownership without triggering RLS recursion.
-- This function runs with the privileges of the owner (superuser), bypassing RLS on access_grants.
CREATE OR REPLACE FUNCTION public.check_is_owner(p_asset_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.access_grants
    WHERE asset_id = p_asset_id
    AND user_id = auth.uid()
    AND permission_level = 'OWNER'::public.app_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update policies on access_grants to use the new function.

-- View: Users can view own grants OR grants on assets they own.
DROP POLICY IF EXISTS "Users can view own grants" ON public.access_grants;
CREATE POLICY "Users can view own grants" ON public.access_grants
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.check_is_owner(asset_id)
    );

-- Create: Only OWNERS can create grants.
DROP POLICY IF EXISTS "Owners can create grants" ON public.access_grants;
CREATE POLICY "Owners can create grants" ON public.access_grants
    FOR INSERT
    WITH CHECK (
        public.check_is_owner(asset_id)
    );

-- Revoke: Only OWNERS can revoke grants.
DROP POLICY IF EXISTS "Owners can revoke grants" ON public.access_grants;
CREATE POLICY "Owners can revoke grants" ON public.access_grants
    FOR DELETE
    USING (
        public.check_is_owner(asset_id)
    );
