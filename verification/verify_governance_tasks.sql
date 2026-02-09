BEGIN;

-- 1. Setup Test Data
-- Create 2 users (simulated by UUIDs)
-- User A: '00000000-0000-0000-0000-000000000001' (Owner)
-- User B: '00000000-0000-0000-0000-000000000002' (No Access)
-- User C: '00000000-0000-0000-0000-000000000003' (Editor) - Optional if needed, but Owner covers "Editor or Owner"
-- Asset X: owned by User A

-- Insert profiles if they don't exist (simulating users)
INSERT INTO auth.users (id, email) VALUES
('00000000-0000-0000-0000-000000000001', 'userA@test.com'),
('00000000-0000-0000-0000-000000000002', 'userB@test.com')
ON CONFLICT DO NOTHING;

-- Insert public profiles
INSERT INTO public.profiles (id, email, full_name) VALUES
('00000000-0000-0000-0000-000000000001', 'userA@test.com', 'User A'),
('00000000-0000-0000-0000-000000000002', 'userB@test.com', 'User B')
ON CONFLICT DO NOTHING;

-- Create Entity
INSERT INTO public.entities (id, name, type, owner_id) VALUES
(gen_random_uuid(), 'Test Entity for Tasks', 'FAMILY', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_task_id UUID;
    v_status public.task_status;
    v_priority public.task_priority;
BEGIN
    SELECT id INTO v_entity_id FROM public.entities WHERE name = 'Test Entity for Tasks' LIMIT 1;

    -- Create Asset X
    -- This should trigger the creation of an Access Grant for the owner.
    INSERT INTO public.assets (name, entity_id, owner_id, type, currency)
    VALUES ('Asset for Tasks', v_entity_id, '00000000-0000-0000-0000-000000000001', 'PROPERTY', 'USD')
    RETURNING id INTO v_asset_id;

    -- Verify Access Grant exists
    IF NOT EXISTS (
        SELECT 1 FROM public.access_grants
        WHERE asset_id = v_asset_id
        AND user_id = '00000000-0000-0000-0000-000000000001'
        AND permission_level = 'OWNER'
    ) THEN
        RAISE NOTICE 'Access Grant trigger failed. Creating grant manually for test.';
        INSERT INTO public.access_grants (asset_id, user_id, permission_level)
        VALUES (v_asset_id, '00000000-0000-0000-0000-000000000001', 'OWNER');
    END IF;

    -- 2. Functional Test: Insert Governance Task as User A (Owner)
    -- Switch to User A
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

    INSERT INTO public.governance_tasks (asset_id, title, description)
    VALUES (v_asset_id, 'Review Tax Document', 'Check for errors')
    RETURNING id, status, priority INTO v_task_id, v_status, v_priority;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Functional Test Failed: Could not insert task as Owner.';
    END IF;

    -- 3. Data Integrity: Default Values
    IF v_status != 'OPEN' THEN
        RAISE EXCEPTION 'Data Integrity Failed: Default status is not OPEN. Got %', v_status;
    END IF;
    IF v_priority != 'MEDIUM' THEN
        RAISE EXCEPTION 'Data Integrity Failed: Default priority is not MEDIUM. Got %', v_priority;
    END IF;

    -- 4. Security Test (RLS): SELECT as User A
    -- Still as User A
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

    IF NOT EXISTS (SELECT 1 FROM public.governance_tasks WHERE id = v_task_id) THEN
        RAISE EXCEPTION 'Security Test Failed: User A cannot see their own task.';
    END IF;

    -- 5. Security Test (RLS): UPDATE as User A
    UPDATE public.governance_tasks
    SET status = 'RESOLVED'
    WHERE id = v_task_id;

    -- Verify Update
    IF NOT EXISTS (SELECT 1 FROM public.governance_tasks WHERE id = v_task_id AND status = 'RESOLVED') THEN
        RAISE EXCEPTION 'Functional Test Failed: User A could not update task status.';
    END IF;

    -- 6. Security Test (RLS): SELECT as User B (No Access)
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

    IF EXISTS (SELECT 1 FROM public.governance_tasks WHERE id = v_task_id) THEN
        RAISE EXCEPTION 'Security Test Failed: User B (No Access) can see User A''s task.';
    END IF;

    -- 7. Security Test (RLS): UPDATE as User B (No Access)
    UPDATE public.governance_tasks
    SET title = 'Hacked'
    WHERE id = v_task_id;

    -- Switch back to Owner to verify no change
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

    IF EXISTS (SELECT 1 FROM public.governance_tasks WHERE id = v_task_id AND title = 'Hacked') THEN
        RAISE EXCEPTION 'Security Test Failed: User B (No Access) was able to update the task.';
    END IF;

    RAISE NOTICE 'All Tests Passed Successfully!';

END $$;

ROLLBACK;
