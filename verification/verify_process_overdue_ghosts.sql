BEGIN;

-- 1. Setup Test Data
DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_owner_id UUID := '00000000-0000-0000-0000-000000000001';
    v_ghost_old_pending_id UUID;
    v_ghost_recent_pending_id UUID;
    v_ghost_old_matched_id UUID;
    v_processed_count INTEGER;
    v_task_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Verification for process_overdue_ghosts()...';

    -- Simulate User/Profile if needed for constraints
    INSERT INTO public.profiles (id, email)
    VALUES (v_owner_id, 'owner@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Create Dummy Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Test Entity Overdue', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- Create Dummy Asset
    -- Note: owner_id is required. Currency is required.
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Test Asset Overdue', v_entity_id, 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_asset_id;

    -- Create Ghost Entry 1: PENDING, Old (61 days ago)
    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description, status)
    VALUES (v_asset_id, CURRENT_DATE - INTERVAL '61 days', 100.00, 'Old Pending Ghost', 'PENDING')
    RETURNING id INTO v_ghost_old_pending_id;

    -- Create Ghost Entry 2: PENDING, Recent (30 days ago)
    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description, status)
    VALUES (v_asset_id, CURRENT_DATE - INTERVAL '30 days', 200.00, 'Recent Pending Ghost', 'PENDING')
    RETURNING id INTO v_ghost_recent_pending_id;

    -- Create Ghost Entry 3: MATCHED, Old (61 days ago)
    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description, status)
    VALUES (v_asset_id, CURRENT_DATE - INTERVAL '61 days', 300.00, 'Old Matched Ghost', 'MATCHED')
    RETURNING id INTO v_ghost_old_matched_id;

    RAISE NOTICE 'Test Data Created.';

    -- 2. Execute Function
    v_processed_count := process_overdue_ghosts();
    RAISE NOTICE 'Function executed. Processed Count: %', v_processed_count;

    -- 3. Verify Results

    -- Check Processed Count
    IF v_processed_count != 1 THEN
        RAISE EXCEPTION 'Test Failed: Expected 1 processed row, got %', v_processed_count;
    END IF;

    -- Check Ghost 1 (Old Pending) -> Should be OVERDUE
    IF (SELECT status FROM public.ghost_entries WHERE id = v_ghost_old_pending_id) != 'OVERDUE' THEN
        RAISE EXCEPTION 'Test Failed: Old Pending Ghost status was not updated to OVERDUE';
    END IF;

    -- Check Task Creation for Ghost 1
    SELECT COUNT(*) INTO v_task_count FROM public.governance_tasks WHERE source_ghost_id = v_ghost_old_pending_id;
    IF v_task_count != 1 THEN
        RAISE EXCEPTION 'Test Failed: Governance Task was not created for Old Pending Ghost';
    END IF;

    -- Check Ghost 2 (Recent Pending) -> Should be PENDING
    IF (SELECT status FROM public.ghost_entries WHERE id = v_ghost_recent_pending_id) != 'PENDING' THEN
        RAISE EXCEPTION 'Test Failed: Recent Pending Ghost status was incorrectly updated';
    END IF;

    -- Check Ghost 3 (Old Matched) -> Should be MATCHED
    IF (SELECT status FROM public.ghost_entries WHERE id = v_ghost_old_matched_id) != 'MATCHED' THEN
        RAISE EXCEPTION 'Test Failed: Old Matched Ghost status was incorrectly updated';
    END IF;

    RAISE NOTICE 'All Verification Tests Passed Successfully!';
END $$;

ROLLBACK;
