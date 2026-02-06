-- Script: verify_airlock_rls.sql
-- Description: Verifies RLS policies for Airlock Items (Task 2.2).
-- Run this script in the Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
    owner_id UUID := gen_random_uuid();
    user_a_id UUID := gen_random_uuid(); -- Granted User
    user_b_id UUID := gen_random_uuid(); -- Outsider
    entity_id UUID := gen_random_uuid();
    asset_id UUID;
    asset_b_id UUID; -- Another asset where User A has no access
    airlock_item_id UUID;
    row_count INT;
BEGIN
    RAISE NOTICE '--- Starting Airlock RLS Verification (Task 2.2) ---';

    -- 1. Setup Data
    RAISE NOTICE '1. Setting up Test Users and Data...';

    -- Create Users
    INSERT INTO auth.users (id, email) VALUES (owner_id, 'owner@test.com');
    INSERT INTO auth.users (id, email) VALUES (user_a_id, 'usera@test.com');
    INSERT INTO auth.users (id, email) VALUES (user_b_id, 'userb@test.com');

    -- Create Profiles (Check if trigger already created them)
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

    -- Create Asset A (User A will have access)
    -- Switch to Owner context
    PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (entity_id, 'Asset A', 'BANK', 'USD', owner_id)
    RETURNING id INTO asset_id;

    -- Grant Access to User A (READ_ONLY is enough for Airlock access)
    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (asset_id, user_a_id, 'READ_ONLY');

    -- Create Asset B (User A will NOT have access)
    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (entity_id, 'Asset B', 'BANK', 'USD', owner_id)
    RETURNING id INTO asset_b_id;

    RAISE NOTICE '   Setup Complete.';

    -- 2. Positive Test: User A can INSERT into Airlock for Asset A
    RAISE NOTICE '2. Testing Positive Access (User A on Asset A)...';
    PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);

    INSERT INTO public.airlock_items (asset_id, file_path, status, ai_payload)
    VALUES (asset_id, 'test/file.pdf', 'QUEUED', '{"test": true}'::jsonb)
    RETURNING id INTO airlock_item_id;

    RAISE NOTICE '   Success: User A inserted airlock item %', airlock_item_id;

    -- Verify Select
    SELECT count(*) INTO row_count FROM public.airlock_items WHERE id = airlock_item_id;
    IF row_count = 0 THEN
        RAISE EXCEPTION 'FAILURE: User A cannot see the item they just inserted!';
    END IF;
    RAISE NOTICE '   Success: User A can see the item.';

    -- 3. Negative Test: User B (Outsider) cannot see Airlock Item
    RAISE NOTICE '3. Testing Isolation (User B)...';
    PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);

    SELECT count(*) INTO row_count FROM public.airlock_items WHERE id = airlock_item_id;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'FAILURE: User B can see the airlock item!';
    END IF;
    RAISE NOTICE '   Success: User B cannot see the item.';

    -- Try to Insert (User B on Asset A)
    BEGIN
        INSERT INTO public.airlock_items (asset_id, file_path)
        VALUES (asset_id, 'test/fail.pdf');
        RAISE EXCEPTION 'FAILURE: User B was able to insert item for Asset A!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: User B blocked from inserting (Error: %)', SQLERRM;
    END;

    -- 4. Negative Test: User A cannot Insert for Asset B
    RAISE NOTICE '4. Testing Cross-Asset Isolation (User A on Asset B)...';
    PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);

    BEGIN
        INSERT INTO public.airlock_items (asset_id, file_path)
        VALUES (asset_b_id, 'test/fail_b.pdf');
        RAISE EXCEPTION 'FAILURE: User A was able to insert item for Asset B (No Access)!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   Success: User A blocked from inserting for Asset B (Error: %)', SQLERRM;
    END;

    RAISE NOTICE '--- Verification PASSED ---';

    -- Cleanup (Rollback handles it usually, but manual cleanup if committed)
    DELETE FROM public.assets WHERE id IN (asset_id, asset_b_id);
    DELETE FROM public.entities WHERE id = entity_id;
    DELETE FROM auth.users WHERE id IN (owner_id, user_a_id, user_b_id);

END $$;

ROLLBACK;
