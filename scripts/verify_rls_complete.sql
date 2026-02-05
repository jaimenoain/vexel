-- Script: verify_rls_complete.sql
-- Description: Verifies RLS policies for Assets and Entities (Task 1.5).
-- Run this script in the Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
    owner_id UUID := gen_random_uuid();
    user_a_id UUID := gen_random_uuid();
    user_b_id UUID := gen_random_uuid();
    entity_id UUID := gen_random_uuid();
    asset_id UUID;
    row_count INT;
BEGIN
    RAISE NOTICE '--- Starting RLS Verification (Task 1.5) ---';

    -- 1. Setup Data
    RAISE NOTICE '1. Setting up Test Users and Data...';

    -- Create Users (simulating auth.users)
    -- Assumes execution with privileges to insert into auth.users
    INSERT INTO auth.users (id, email) VALUES (owner_id, 'owner@test.com');
    INSERT INTO auth.users (id, email) VALUES (user_a_id, 'usera@test.com');
    INSERT INTO auth.users (id, email) VALUES (user_b_id, 'userb@test.com');

    -- Ensure profiles exist (Trigger usually handles this, but for safety in test)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id) THEN
        INSERT INTO public.profiles (id, email, role) VALUES (owner_id, 'owner@test.com', 'PRINCIPAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_a_id) THEN
        INSERT INTO public.profiles (id, email, role) VALUES (user_a_id, 'usera@test.com', 'PRINCIPAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_b_id) THEN
        INSERT INTO public.profiles (id, email, role) VALUES (user_b_id, 'userb@test.com', 'PRINCIPAL');
    END IF;

    -- Create Entity
    INSERT INTO public.entities (id, name, type)
    VALUES (entity_id, 'Test Entity', 'FAMILY');

    -- Switch to Owner context
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    -- Create Asset (as Owner)
    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (entity_id, 'Secret Asset', 'BANK', 'USD', owner_id)
    RETURNING id INTO asset_id;

    RAISE NOTICE '   Asset created: %', asset_id;

    -- Verify Owner Grant (Automatic)
    IF NOT EXISTS (SELECT 1 FROM public.access_grants WHERE asset_id = asset_id AND user_id = owner_id AND permission_level = 'OWNER') THEN
         RAISE EXCEPTION 'Owner grant was not automatically created!';
    END IF;

    -- Grant Access to User A (READ_ONLY)
    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (asset_id, user_a_id, 'READ_ONLY');

    RAISE NOTICE '   Setup Complete.';

    -- 2. Isolation Test (User B - Outsider)
    RAISE NOTICE '2. Testing Isolation (User B)...';
    PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);

    SELECT count(*) INTO row_count FROM public.assets WHERE id = asset_id;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'FAILURE: User B can see the asset!';
    END IF;
    RAISE NOTICE '   Success: User B cannot see asset.';

    -- 3. Permission Level Test (User A - Read Only)
    RAISE NOTICE '3. Testing READ_ONLY Permissions (User A)...';
    PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);

    -- Try to Update
    UPDATE public.assets SET name = 'Hacked Name' WHERE id = asset_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;

    IF row_count > 0 THEN
        RAISE EXCEPTION 'FAILURE: READ_ONLY user was able to update asset!';
    END IF;
    RAISE NOTICE '   Success: READ_ONLY user cannot update.';

    -- Upgrade to EDITOR (As Owner)
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
    -- Test Owner Update Grant Policy
    UPDATE public.access_grants
    SET permission_level = 'EDITOR'
    WHERE asset_id = asset_id AND user_id = user_a_id;

    -- Test Update again (User A - Editor)
    RAISE NOTICE '   Testing EDITOR Permissions (User A)...';
    PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);

    UPDATE public.assets SET name = 'Legit Update' WHERE id = asset_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;

    IF row_count = 0 THEN
        RAISE EXCEPTION 'FAILURE: EDITOR user was UNABLE to update asset!';
    END IF;
    RAISE NOTICE '   Success: EDITOR user can update.';

    -- 4. Entity Cascade Test
    RAISE NOTICE '4. Testing Entity Cascade...';

    -- User A (has access to asset in entity)
    PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);
    SELECT count(*) INTO row_count FROM public.entities WHERE id = entity_id;
    IF row_count = 0 THEN
        RAISE EXCEPTION 'FAILURE: User A cannot see Entity despite having asset access!';
    END IF;
    RAISE NOTICE '   Success: User A can see Entity.';

    -- User B (no access)
    PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);
    SELECT count(*) INTO row_count FROM public.entities WHERE id = entity_id;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'FAILURE: User B can see Entity without asset access!';
    END IF;
    RAISE NOTICE '   Success: User B cannot see Entity.';

    -- 5. Performance Check (Visual)
    RAISE NOTICE '5. Performance Check...';
    RAISE NOTICE '   Run the following command to check execution plan:';
    RAISE NOTICE '   EXPLAIN ANALYZE SELECT * FROM public.entities e JOIN public.assets a ON e.id = a.entity_id;';

    RAISE NOTICE '--- Verification PASSED ---';

    -- Clean up
    RAISE NOTICE 'Cleaning up test data...';
    -- Switch to superuser/admin role logic if needed, but assuming script has privileges.
    -- Reset to default config just in case
    PERFORM set_config('role', 'postgres', true);
    -- Or whatever the default role was.
    -- Note: Deleting auth.users cascades to profiles and grants (if configured).
    DELETE FROM public.assets WHERE id = asset_id;
    DELETE FROM public.entities WHERE id = entity_id;
    DELETE FROM auth.users WHERE id IN (owner_id, user_a_id, user_b_id);

END $$;

ROLLBACK; -- Ensures test data is not persisted if run in a transaction (optional, but good for idempotent tests)
