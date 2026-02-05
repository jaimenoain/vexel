-- Ensure assets table exists
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns safely if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'name') THEN
        ALTER TABLE public.assets ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'owner_id') THEN
        ALTER TABLE public.assets ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create access_grants table
CREATE TABLE IF NOT EXISTS public.access_grants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_level TEXT CHECK (access_level IN ('VIEW', 'EDIT')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(asset_id, user_id)
);

-- Enable RLS on access_grants
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- ----------------------------
-- Policies for Assets
-- ----------------------------

-- 1. Create: Authenticated users can create assets.
-- We enforce that the owner_id must match the auth.uid().
DROP POLICY IF EXISTS "Users can create assets" ON public.assets;
CREATE POLICY "Users can create assets" ON public.assets
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- 2. View: Users can view assets if they are the owner OR they have a grant.
DROP POLICY IF EXISTS "Users can view assets" ON public.assets;
CREATE POLICY "Users can view assets" ON public.assets
    FOR SELECT
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
        )
    );

-- 3. Update: Users can update assets if they are the owner OR they have an 'EDIT' grant.
DROP POLICY IF EXISTS "Users can update assets" ON public.assets;
CREATE POLICY "Users can update assets" ON public.assets
    FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.access_grants
            WHERE access_grants.asset_id = assets.id
            AND access_grants.user_id = auth.uid()
            AND access_grants.access_level = 'EDIT'
        )
    );

-- 4. Delete: Only owners can delete assets (Optional but good practice)
DROP POLICY IF EXISTS "Owners can delete assets" ON public.assets;
CREATE POLICY "Owners can delete assets" ON public.assets
    FOR DELETE
    USING (owner_id = auth.uid());


-- ----------------------------
-- Policies for AccessGrants
-- ----------------------------

-- 1. View: Users can view grants that belong to them (so they know what they have access to).
-- Optionally, owners of assets should be able to see who they granted access to.
DROP POLICY IF EXISTS "Users can view own grants" ON public.access_grants;
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

-- 2. Create: Only owners of an asset can grant access to it.
DROP POLICY IF EXISTS "Owners can create grants" ON public.access_grants;
CREATE POLICY "Owners can create grants" ON public.access_grants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assets
            WHERE assets.id = access_grants.asset_id
            AND assets.owner_id = auth.uid()
        )
    );

-- 3. Delete: Owners can revoke grants.
DROP POLICY IF EXISTS "Owners can revoke grants" ON public.access_grants;
CREATE POLICY "Owners can revoke grants" ON public.access_grants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.assets
            WHERE assets.id = access_grants.asset_id
            AND assets.owner_id = auth.uid()
        )
    );
