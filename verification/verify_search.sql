BEGIN;

DO $$
DECLARE
    v_user_a_id UUID := '00000000-0000-0000-0000-00000000000A'; -- Has access
    v_user_b_id UUID := '00000000-0000-0000-0000-00000000000B'; -- No access
    v_entity_id UUID;
    v_asset_id UUID;
    v_txn_id UUID;
    search_result RECORD;
    found_asset BOOLEAN := FALSE;
    found_txn BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Starting Global Search Verification...';

    -- 1. Setup Users
    INSERT INTO auth.users (id, email) VALUES (v_user_a_id, 'user_a@test.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email) VALUES (v_user_a_id, 'user_a@test.com') ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES (v_user_b_id, 'user_b@test.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email) VALUES (v_user_b_id, 'user_b@test.com') ON CONFLICT (id) DO NOTHING;

    -- 2. Setup Data (Entity, Asset, Transaction) owned by User A
    INSERT INTO public.entities (name, type) VALUES ('Search Entity', 'FAMILY') RETURNING id INTO v_entity_id;

    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (v_entity_id, 'Searchable Asset', 'BANK', 'USD', v_user_a_id)
    RETURNING id INTO v_asset_id;

    -- Ensure User A has access grant
    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (v_asset_id, v_user_a_id, 'OWNER')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Searchable Transaction', '2023-01-01')
    RETURNING id INTO v_txn_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn_id, v_asset_id, 100, 'DEBIT');

    -- 3. Test as User A (Should find Asset and Transaction)
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    found_asset := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable Asset') LOOP
        IF search_result.type = 'ASSET' AND search_result.id = v_asset_id THEN
            found_asset := TRUE;
        END IF;
    END LOOP;

    IF NOT found_asset THEN
        RAISE EXCEPTION 'User A failed to find the asset';
    END IF;

    found_txn := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable Transaction') LOOP
        IF search_result.type = 'TRANSACTION' AND search_result.id = v_txn_id THEN
            found_txn := TRUE;
        END IF;
    END LOOP;

    IF NOT found_txn THEN
        RAISE EXCEPTION 'User A failed to find the transaction';
    END IF;

    RAISE NOTICE 'User A Search Verification Passed';

    -- 4. Test as User B (Should NOT find anything)
    PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    found_asset := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable Asset') LOOP
        IF search_result.type = 'ASSET' AND search_result.id = v_asset_id THEN
            found_asset := TRUE;
        END IF;
    END LOOP;

    IF found_asset THEN
        RAISE EXCEPTION 'User B found the asset (Security Breach)';
    END IF;

    found_txn := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable Transaction') LOOP
        IF search_result.type = 'TRANSACTION' AND search_result.id = v_txn_id THEN
            found_txn := TRUE;
        END IF;
    END LOOP;

    IF found_txn THEN
        RAISE EXCEPTION 'User B found the transaction (Security Breach)';
    END IF;

    RAISE NOTICE 'User B Search Verification Passed';

    RAISE NOTICE 'Global Search Verification Passed!';
END $$;

ROLLBACK;
