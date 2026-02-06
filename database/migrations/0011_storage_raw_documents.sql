-- Migration: 0011_storage_raw_documents.sql
-- Description: Provisions 'raw-documents' bucket and applies strict RLS policies for Asset Segregation.

-- 1. Create Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw-documents', 'raw-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (Ensure it is enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow Uploads (INSERT)
-- Requirements:
-- - Bucket: raw-documents
-- - Auth: User must be authenticated and match owner.
-- - Path: {asset_id}/{filename} (Asset ID must be valid UUID format)
-- - MIME: application/pdf or text/csv
-- - Permission: User must be EDITOR or OWNER of the asset in public.access_grants

DROP POLICY IF EXISTS "Allow Uploads for Editors and Owners" ON storage.objects;

CREATE POLICY "Allow Uploads for Editors and Owners" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'raw-documents' AND
    auth.uid() = owner AND
    -- Path Structure Check: starts with UUID + /
    name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.+$' AND
    -- MIME Type Check
    metadata->>'mimetype' IN ('application/pdf', 'text/csv') AND
    -- Permission Check
    EXISTS (
        SELECT 1
        FROM public.access_grants
        WHERE user_id = auth.uid()
        -- Extract Asset ID from path (safe because of regex check above)
        AND asset_id = (split_part(name, '/', 1)::uuid)
        AND permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
    )
);

-- 4. Policy: Allow View/Download (SELECT)
-- Requirements:
-- - Bucket: raw-documents
-- - Permission: User must be EDITOR or OWNER of the asset.

DROP POLICY IF EXISTS "Allow View for Authorized Users" ON storage.objects;

CREATE POLICY "Allow View for Authorized Users" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'raw-documents' AND
    -- Path Structure Check (Implicitly filters out bad paths too)
    name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.+$' AND
    -- Permission Check
    EXISTS (
        SELECT 1
        FROM public.access_grants
        WHERE user_id = auth.uid()
        AND asset_id = (split_part(name, '/', 1)::uuid)
        AND permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
    )
);
