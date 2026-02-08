BEGIN;

DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_owner_id UUID := '00000000-0000-0000-0000-000000000001';
    v_ghost_id UUID;
    v_task_record RECORD;
    v_task_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Governance Trigger Verification...';

    -- 1. Setup Data
    -- Simulate User/Profile (if not exists)
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'owner@test.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email)
    VALUES (v_owner_id, 'owner@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Create Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Test Entity Gov Trigger', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- Create Asset
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Test Asset Gov Trigger', v_entity_id, 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_asset_id;

    -- Create Ghost Entry: PENDING
    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description, status)
    VALUES (v_asset_id, CURRENT_DATE - INTERVAL '10 days', 100.00, 'Ghost Trigger Test', 'PENDING')
    RETURNING id INTO v_ghost_id;

    RAISE NOTICE 'Test Data Created. Ghost ID: %', v_ghost_id;

    -- 2. Test Trigger Execution (Manual Update)
    UPDATE public.ghost_entries
    SET status = 'OVERDUE'
    WHERE id = v_ghost_id;

    -- 3. Assertion: Task Creation
    SELECT * INTO v_task_record
    FROM public.governance_tasks
    WHERE source_ghost_id = v_ghost_id;

    IF v_task_record IS NULL THEN
        RAISE EXCEPTION 'Assertion Failed: Governance Task was not created by trigger.';
    END IF;

    IF v_task_record.priority != 'CRITICAL' THEN
        RAISE EXCEPTION 'Assertion Failed: Task priority is %, expected CRITICAL', v_task_record.priority;
    END IF;

    IF (v_task_record.action_payload->>'type') != 'UPLOAD_PROOF' THEN
        RAISE EXCEPTION 'Assertion Failed: Action payload type is %, expected UPLOAD_PROOF', v_task_record.action_payload->>'type';
    END IF;

    IF (v_task_record.action_payload->>'ghost_id')::UUID != v_ghost_id THEN
        RAISE EXCEPTION 'Assertion Failed: Action payload ghost_id mismatch.';
    END IF;

    IF v_task_record.title != 'Missing Proof for Ghost Trigger Test' THEN
        RAISE EXCEPTION 'Assertion Failed: Task title is incorrect. Got: %', v_task_record.title;
    END IF;

    RAISE NOTICE 'Assertion Passed: Governance Task created correctly via trigger.';

    -- 4. Test Idempotency
    -- Update status again (no change effectively, but update happens)
    UPDATE public.ghost_entries
    SET status = 'OVERDUE'
    WHERE id = v_ghost_id;

    SELECT COUNT(*) INTO v_task_count
    FROM public.governance_tasks
    WHERE source_ghost_id = v_ghost_id;

    IF v_task_count != 1 THEN
        RAISE EXCEPTION 'Assertion Failed: Idempotency check failed. Count: %', v_task_count;
    END IF;

    RAISE NOTICE 'Assertion Passed: Idempotency verified.';

    RAISE NOTICE 'All Tests Passed Successfully!';
END $$;

ROLLBACK;
