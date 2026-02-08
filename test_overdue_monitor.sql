BEGIN;

DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_owner_id UUID := '00000000-0000-0000-0000-000000000001';
    v_ghost_id UUID;
    v_processed_count INTEGER;
    v_task_count INTEGER;
    v_cron_job_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting Overdue Monitor Verification...';

    -- 1. Setup Data
    -- Simulate User/Profile
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'owner@test.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email)
    VALUES (v_owner_id, 'owner@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Create Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Test Entity Overdue Monitor', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- Create Asset
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Test Asset Overdue Monitor', v_entity_id, 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_asset_id;

    -- Create Ghost Entry: PENDING, 65 days ago
    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description, status)
    VALUES (v_asset_id, CURRENT_DATE - INTERVAL '65 days', 100.00, 'Overdue Ghost Monitor Test', 'PENDING')
    RETURNING id INTO v_ghost_id;

    RAISE NOTICE 'Test Data Created. Ghost ID: %', v_ghost_id;

    -- 2. Execution
    v_processed_count := process_overdue_ghosts();
    RAISE NOTICE 'Function executed. Processed Count: %', v_processed_count;

    -- 3. Assertion 1: Ghost Status
    IF (SELECT status FROM public.ghost_entries WHERE id = v_ghost_id) != 'OVERDUE' THEN
        RAISE EXCEPTION 'Assertion 1 Failed: Ghost status was not updated to OVERDUE';
    END IF;
    RAISE NOTICE 'Assertion 1 Passed: Ghost status updated to OVERDUE.';

    -- 4. Assertion 2: Task Creation
    SELECT COUNT(*) INTO v_task_count
    FROM public.governance_tasks
    WHERE source_ghost_id = v_ghost_id
      AND priority = 'HIGH'
      AND asset_id = v_asset_id
      AND status = 'OPEN';

    IF v_task_count != 1 THEN
        RAISE EXCEPTION 'Assertion 2 Failed: Governance Task was not created correctly. Count: %', v_task_count;
    END IF;
    RAISE NOTICE 'Assertion 2 Passed: Governance Task created correctly.';

    -- 5. Assertion 3: Scheduler
    SELECT EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = 'process-overdue-ghosts'
           OR command = 'SELECT process_overdue_ghosts()'
    ) INTO v_cron_job_exists;

    IF NOT v_cron_job_exists THEN
        RAISE EXCEPTION 'Assertion 3 Failed: Cron job not found. Ensure pg_cron is enabled and migration 0021 ran.';
    END IF;
    RAISE NOTICE 'Assertion 3 Passed: Cron job found.';

    RAISE NOTICE 'All Tests Passed Successfully!';
END $$;

ROLLBACK;
