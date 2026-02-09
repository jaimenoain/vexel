BEGIN;

DO $$
DECLARE
    v_owner_id UUID := '00000000-0000-0000-0000-000000000099';
    v_entity_id UUID;
    v_asset_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Soft Limit Verification...';

    -- 1. Setup Data: Create User and Profile
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'softlimit@test.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email)
    VALUES (v_owner_id, 'softlimit@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Create Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Soft Limit Test Entity', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- 2. Insert 5 Assets (At Limit)
    FOR i IN 1..5 LOOP
        INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
        VALUES ('Asset ' || i, v_entity_id, 'BANK', 'USD', v_owner_id);
    END LOOP;

    -- Verify count is 5
    SELECT count(*) INTO v_asset_count FROM public.assets WHERE owner_id = v_owner_id;
    IF v_asset_count != 5 THEN
        RAISE EXCEPTION 'Assertion Failed: Expected 5 assets, found %', v_asset_count;
    END IF;
    RAISE NOTICE 'Created 5 assets successfully.';

    -- 3. Insert 6th Asset (Over Limit)
    -- This should SUCCEED (Soft Limit)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Asset 6', v_entity_id, 'BANK', 'USD', v_owner_id);

    -- Verify count is 6
    SELECT count(*) INTO v_asset_count FROM public.assets WHERE owner_id = v_owner_id;
    IF v_asset_count != 6 THEN
        RAISE EXCEPTION 'Assertion Failed: Expected 6 assets, found %', v_asset_count;
    END IF;
    RAISE NOTICE 'Created 6th asset successfully. Soft limit enforced correctly (creation allowed).';

    RAISE NOTICE 'All Soft Limit Tests Passed!';
END $$;

ROLLBACK;
