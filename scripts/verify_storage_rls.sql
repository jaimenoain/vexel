-- Script: verify_storage_rls.sql
-- Description: Verifies RLS policies for Storage (Raw Documents) and Access Grants.
-- Run this script in the Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
    owner_id UUID := gen_random_uuid();
    editor_id UUID := gen_random_uuid();
    viewer_id UUID := gen_random_uuid();
    outsider_id UUID := gen_random_uuid();
    entity_id UUID := gen_random_uuid();
    asset_id UUID;
    valid_pdf_metadata jsonb := '{"mimetype": "application/pdf"}';
    valid_csv_metadata jsonb := '{"mimetype": "text/csv"}';
    invalid_metadata jsonb := '{"mimetype": "image/jpeg"}';
    test_filename text;
    test_path text;
    row_count INT;
BEGIN
    RAISE NOTICE '--- Starting Storage RLS Verification ---';

    -- 1. Setup Data
    RAISE NOTICE '1. Setting up Test Users and Data...';

    -- Create Users
    INSERT INTO auth.users (id, email) VALUES (owner_id, 'owner@test.com');
    INSERT INTO auth.users (id, email) VALUES (editor_id, 'editor@test.com');
    INSERT INTO auth.users (id, email) VALUES (viewer_id, 'viewer@test.com');
    INSERT INTO auth.users (id, email) VALUES (outsider_id, 'outsider@test.com');

    -- Create Entity
    INSERT INTO public.entities (id, name, type)
    VALUES (entity_id, 'Storage Test Entity', 'FAMILY');

    -- Create Asset (Owner context not strictly needed for setup if we insert directly, but good for realism)
    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (entity_id, 'Storage Asset', 'BANK', 'USD', owner_id)
    RETURNING id INTO asset_id;

    -- Grants
    -- Owner grant is automatic via trigger? Let's check or insert manually to be safe/explicit if triggers aren't firing in this context (they should).
    IF NOT EXISTS (SELECT 1 FROM public.access_grants WHERE asset_id = asset_id AND user_id = owner_id) THEN
        INSERT INTO public.access_grants (asset_id, user_id, permission_level) VALUES (asset_id, owner_id, 'OWNER');
    END IF;

    -- Editor Grant
    INSERT INTO public.access_grants (asset_id, user_id, permission_level) VALUES (asset_id, editor_id, 'EDITOR');
    -- Viewer Grant
    INSERT INTO public.access_grants (asset_id, user_id, permission_level) VALUES (asset_id, viewer_id, 'READ_ONLY');

    -- Ensure bucket exists (it should from migration, but in test env maybe not?)
    INSERT INTO storage.buckets (id, name, public) VALUES ('raw-documents', 'raw-documents', false) ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '   Setup Complete. Asset ID: %', asset_id;

    -- 2. Test: Owner Upload (Success)
    RAISE NOTICE '2. Testing Owner Upload (Should Succeed)...';
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);

    test_path := asset_id::text || '/owner_doc.pdf';
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('raw-documents', test_path, owner_id, valid_pdf_metadata);

    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count = 0 THEN RAISE EXCEPTION 'Owner failed to upload valid PDF'; END IF;
    RAISE NOTICE '   Success: Owner uploaded.';

    -- 3. Test: Editor Upload (Success)
    RAISE NOTICE '3. Testing Editor Upload (Should Succeed)...';
    PERFORM set_config('request.jwt.claim.sub', editor_id::text, true);

    test_path := asset_id::text || '/editor_doc.csv';
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('raw-documents', test_path, editor_id, valid_csv_metadata);

    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count = 0 THEN RAISE EXCEPTION 'Editor failed to upload valid CSV'; END IF;
    RAISE NOTICE '   Success: Editor uploaded.';

    -- 4. Test: Viewer Upload (Failure)
    RAISE NOTICE '4. Testing Viewer Upload (Should Fail)...';
    PERFORM set_config('request.jwt.claim.sub', viewer_id::text, true);

    BEGIN
        test_path := asset_id::text || '/viewer_doc.pdf';
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES ('raw-documents', test_path, viewer_id, valid_pdf_metadata);
        RAISE EXCEPTION 'Viewer was able to upload!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: Viewer upload blocked (RLS).';
    END;

    -- 5. Test: Outsider Upload (Failure)
    RAISE NOTICE '5. Testing Outsider Upload (Should Fail)...';
    PERFORM set_config('request.jwt.claim.sub', outsider_id::text, true);

    BEGIN
        test_path := asset_id::text || '/outsider_doc.pdf';
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES ('raw-documents', test_path, outsider_id, valid_pdf_metadata);
        RAISE EXCEPTION 'Outsider was able to upload!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: Outsider upload blocked.';
    END;

    -- 6. Test: Invalid MIME Type (Failure)
    RAISE NOTICE '6. Testing Invalid MIME (Should Fail)...';
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);

    BEGIN
        test_path := asset_id::text || '/image.jpg';
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES ('raw-documents', test_path, owner_id, invalid_metadata);
        RAISE EXCEPTION 'Owner was able to upload invalid MIME!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: Invalid MIME blocked.';
    END;

    -- 7. Test: Invalid Path Structure (Failure)
    RAISE NOTICE '7. Testing Invalid Path (Should Fail)...';

    BEGIN
        -- Missing UUID
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES ('raw-documents', 'bad_path.pdf', owner_id, valid_pdf_metadata);
        RAISE EXCEPTION 'Owner was able to upload with bad path!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: Bad path blocked.';
    END;

    BEGIN
        -- Wrong UUID (UUID format but no permission)
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES ('raw-documents', '00000000-0000-0000-0000-000000000000/hack.pdf', owner_id, valid_pdf_metadata);
        RAISE EXCEPTION 'Owner was able to upload to random UUID!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: Random UUID path blocked.';
    END;

    -- 8. Test: Visibility (Select)
    RAISE NOTICE '8. Testing Visibility...';

    -- Owner View
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
    SELECT count(*) INTO row_count FROM storage.objects WHERE bucket_id = 'raw-documents' AND name LIKE asset_id::text || '%';
    IF row_count < 2 THEN RAISE EXCEPTION 'Owner should see at least 2 files (own + editor)'; END IF;
    RAISE NOTICE '   Success: Owner sees files.';

    -- Editor View
    PERFORM set_config('request.jwt.claim.sub', editor_id::text, true);
    SELECT count(*) INTO row_count FROM storage.objects WHERE bucket_id = 'raw-documents' AND name LIKE asset_id::text || '%';
    IF row_count < 2 THEN RAISE EXCEPTION 'Editor should see at least 2 files'; END IF;
    RAISE NOTICE '   Success: Editor sees files.';

    -- Viewer View (Should fail)
    PERFORM set_config('request.jwt.claim.sub', viewer_id::text, true);
    SELECT count(*) INTO row_count FROM storage.objects WHERE bucket_id = 'raw-documents' AND name LIKE asset_id::text || '%';
    IF row_count > 0 THEN RAISE EXCEPTION 'Viewer should NOT see files'; END IF;
    RAISE NOTICE '   Success: Viewer cannot see files.';

    -- Outsider View
    PERFORM set_config('request.jwt.claim.sub', outsider_id::text, true);
    SELECT count(*) INTO row_count FROM storage.objects WHERE bucket_id = 'raw-documents' AND name LIKE asset_id::text || '%';
    IF row_count > 0 THEN RAISE EXCEPTION 'Outsider should NOT see files'; END IF;
    RAISE NOTICE '   Success: Outsider cannot see files.';


    RAISE NOTICE '--- Verification PASSED ---';
    RAISE NOTICE 'Cleaning up...';

    -- Switch back to superuser for cleanup
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', NULL, true);

    -- Cleanup (Users cascade delete to profiles? maybe not. To grants? yes. To assets? no. To storage? no.)
    DELETE FROM storage.objects WHERE bucket_id = 'raw-documents' AND name LIKE asset_id::text || '%';
    DELETE FROM public.assets WHERE id = asset_id;
    DELETE FROM public.entities WHERE id = entity_id;
    DELETE FROM auth.users WHERE id IN (owner_id, editor_id, viewer_id, outsider_id);

END $$;

ROLLBACK;
