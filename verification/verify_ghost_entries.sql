BEGIN;

-- 1. Setup Test Data
-- Create 2 users (simulated by UUIDs)
-- User A: '00000000-0000-0000-0000-000000000001'
-- User B: '00000000-0000-0000-0000-000000000002'
-- Asset X: owned by User A

INSERT INTO public.profiles (id, email) VALUES
('00000000-0000-0000-0000-000000000001', 'userA@test.com'),
('00000000-0000-0000-0000-000000000002', 'userB@test.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.entities (name, type, owner_id) VALUES ('Test Entity', 'FAMILY', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Get Entity ID and Create Asset
DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_ghost_id UUID;
    v_status public.ghost_status;
BEGIN
    SELECT id INTO v_entity_id FROM public.entities WHERE name = 'Test Entity' LIMIT 1;

    INSERT INTO public.assets (name, entity_id, owner_id, type, currency)
    VALUES ('Asset X', v_entity_id, '00000000-0000-0000-0000-000000000001', 'PROPERTY', 'USD')
    RETURNING id INTO v_asset_id;

    -- Grant Access to User A (Owner) is handled by trigger in 0009_refactor_access_grants.sql
    -- "handle_new_asset_grant" -> Inserts OWNER grant for new.owner_id

    -- 2. Functional Test: Insert "Rent" Ghost Entry as User A
    -- Switch to User A
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
    PERFORM set_config('role', 'authenticated', true);

    INSERT INTO public.ghost_entries (asset_id, expected_date, expected_amount, description)
    VALUES (v_asset_id, '2025-01-01', 1000, 'Rent')
    RETURNING id, status INTO v_ghost_id, v_status;

    IF v_ghost_id IS NULL THEN
        RAISE EXCEPTION 'Functional Test Failed: Could not insert ghost entry as Owner.';
    END IF;

    -- 3. Data Integrity: Status Default
    IF v_status IS NULL OR v_status != 'PENDING' THEN
        RAISE EXCEPTION 'Data Integrity Failed: Default status is not PENDING. Got %', v_status;
    END IF;

    -- 4. Security Test (RLS): SELECT as User A
    -- Still as User A
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

    IF NOT EXISTS (SELECT 1 FROM public.ghost_entries WHERE id = v_ghost_id) THEN
        RAISE EXCEPTION 'Security Test Failed: User A cannot see their own ghost entry.';
    END IF;

    -- 5. Security Test (RLS): SELECT as User B (No Access)
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
    PERFORM set_config('role', 'authenticated', true);

    IF EXISTS (SELECT 1 FROM public.ghost_entries WHERE id = v_ghost_id) THEN
        RAISE EXCEPTION 'Security Test Failed: User B can see User A''s ghost entry.';
    END IF;

    RAISE NOTICE 'All Tests Passed Successfully!';

END $$;

ROLLBACK;
