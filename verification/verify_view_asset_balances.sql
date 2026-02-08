DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id_1 UUID;
    v_asset_id_2 UUID;
    v_txn_id UUID;
    v_balance NUMERIC;
BEGIN
    RAISE NOTICE 'Starting View Asset Balances Verification...';

    -- 1. Setup Test Data (Entity and Assets)
    INSERT INTO public.entities (name, type) VALUES ('Test Entity', 'FAMILY') RETURNING id INTO v_entity_id;
    INSERT INTO public.assets (name, type, currency, entity_id) VALUES ('Test Asset 1', 'BANK', 'USD', v_entity_id) RETURNING id INTO v_asset_id_1;
    INSERT INTO public.assets (name, type, currency, entity_id) VALUES ('Test Asset 2', 'BANK', 'USD', v_entity_id) RETURNING id INTO v_asset_id_2;

    -- 2. Create Ledger Transaction
    INSERT INTO public.ledger_transactions (description, date) VALUES ('Test Txn', '2023-01-01') RETURNING id INTO v_txn_id;

    -- 3. Create Ledger Lines
    -- Asset 1: Debit 100
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type) VALUES (v_txn_id, v_asset_id_1, 100, 'DEBIT');
    -- Asset 2: Credit 100 (Balance)
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type) VALUES (v_txn_id, v_asset_id_2, 100, 'CREDIT');

    -- 4. Verify View Output for Asset 1
    SELECT balance INTO v_balance FROM public.view_asset_balances WHERE asset_id = v_asset_id_1;
    IF v_balance IS NULL OR v_balance != 100 THEN
        RAISE EXCEPTION 'Asset 1 Balance incorrect. Expected 100, got %', v_balance;
    END IF;

    -- 5. Verify View Output for Asset 2
    SELECT balance INTO v_balance FROM public.view_asset_balances WHERE asset_id = v_asset_id_2;
    IF v_balance IS NULL OR v_balance != -100 THEN
        RAISE EXCEPTION 'Asset 2 Balance incorrect. Expected -100, got %', v_balance;
    END IF;

    RAISE NOTICE '✅ Verification Successful!';

    -- Cleanup (Rollback simulates this but explicit cleanup is good practice in scripts)
    DELETE FROM public.ledger_lines WHERE transaction_id = v_txn_id;
    DELETE FROM public.ledger_transactions WHERE id = v_txn_id;
    DELETE FROM public.assets WHERE entity_id = v_entity_id;
    DELETE FROM public.entities WHERE id = v_entity_id;
END $$;
