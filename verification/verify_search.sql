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

    -- Index verification variables
    found_extension BOOLEAN := FALSE;
    found_assets_index BOOLEAN := FALSE;
    found_transactions_index BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Starting Global Search QA Verification...';

    -- 1. Verify Indexing and Extension
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') INTO found_extension;
    IF NOT found_extension THEN
        RAISE EXCEPTION 'pg_trgm extension is NOT enabled.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'assets' AND indexname = 'idx_assets_name_trgm'
    ) INTO found_assets_index;
    IF NOT found_assets_index THEN
        RAISE EXCEPTION 'idx_assets_name_trgm index is MISSING on assets table.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'ledger_transactions' AND indexname = 'idx_ledger_transactions_description_trgm'
    ) INTO found_transactions_index;
    IF NOT found_transactions_index THEN
        RAISE EXCEPTION 'idx_ledger_transactions_description_trgm index is MISSING on ledger_transactions table.';
    END IF;

    RAISE NOTICE 'Indexing Verification Passed';

    -- 2. Setup Users
    INSERT INTO auth.users (id, email) VALUES (v_user_a_id, 'user_a@test.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email) VALUES (v_user_a_id, 'user_a@test.com') ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES (v_user_b_id, 'user_b@test.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email) VALUES (v_user_b_id, 'user_b@test.com') ON CONFLICT (id) DO NOTHING;

    -- 3. Setup Data (Entity, Asset, Transaction) owned by User A
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

    -- 4. Test Unified Results (User A)
    -- Search for "Searchable" should return both Asset and Transaction
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    found_asset := FALSE;
    found_txn := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable') LOOP
        IF search_result.type = 'ASSET' AND search_result.id = v_asset_id THEN
            found_asset := TRUE;
        ELSIF search_result.type = 'TRANSACTION' AND search_result.id = v_txn_id THEN
            found_txn := TRUE;
        END IF;
    END LOOP;

    IF NOT found_asset THEN
        RAISE EXCEPTION 'User A failed to find the asset in unified search';
    END IF;
    IF NOT found_txn THEN
        RAISE EXCEPTION 'User A failed to find the transaction in unified search';
    END IF;

    RAISE NOTICE 'Unified Results Verification Passed';

    -- 5. Test RLS Enforcement (User B)
    -- User B has NO access grants. Should see NOTHING.
    PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    found_asset := FALSE;
    found_txn := FALSE;
    FOR search_result IN SELECT * FROM public.search_global('Searchable') LOOP
        IF search_result.type = 'ASSET' AND search_result.id = v_asset_id THEN
            found_asset := TRUE;
        ELSIF search_result.type = 'TRANSACTION' AND search_result.id = v_txn_id THEN
            found_txn := TRUE;
        END IF;
    END LOOP;

    IF found_asset THEN
        RAISE EXCEPTION 'User B found the asset (RLS LEAKAGE)';
    END IF;
    IF found_txn THEN
        RAISE EXCEPTION 'User B found the transaction (RLS LEAKAGE)';
    END IF;

    RAISE NOTICE 'RLS Enforcement Verification Passed';

    RAISE NOTICE 'ALL CHECKS PASSED SUCCESSFULLY!';
END $$;

ROLLBACK;
