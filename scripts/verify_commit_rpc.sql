DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_expense_asset_id UUID;
    v_item_id UUID;
    v_txn_id UUID;
    v_payload JSONB;
BEGIN
    RAISE NOTICE 'Starting Airlock Commit RPC Verification...';

    -- 1. Create Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Test Commit Entity', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- 2. Create Assets
    -- Main Asset (Bank)
    INSERT INTO public.assets (name, type, currency, entity_id)
    VALUES ('Test Commit Bank', 'BANK', 'USD', v_entity_id)
    RETURNING id INTO v_asset_id;

    -- Expense Asset
    INSERT INTO public.assets (name, type, currency, entity_id)
    VALUES ('Test Commit Expense', 'BANK', 'USD', v_entity_id) -- Using BANK as generic asset for test
    RETURNING id INTO v_expense_asset_id;

    -- 3. Create Airlock Item (Balanced)
    -- Transaction: Spent 50 on Expense.
    -- Bank: -50 (Credit)
    -- Expense: +50 (Debit)
    v_payload := jsonb_build_object(
        'transactions', jsonb_build_array(
            jsonb_build_object(
                'date', '2023-10-27',
                'description', 'Test Expense',
                'amount', -50,
                'category', '' -- Should map to v_asset_id (Bank)
            ),
            jsonb_build_object(
                'date', '2023-10-27',
                'description', 'Test Expense Split',
                'amount', 50,
                'category', 'Test Commit Expense' -- Should map to v_expense_asset_id
            )
        )
    );

    INSERT INTO public.airlock_items (asset_id, status, traffic_light, ai_payload, file_path)
    VALUES (v_asset_id, 'REVIEW_NEEDED', 'GREEN', v_payload, 'test/path.pdf')
    RETURNING id INTO v_item_id;

    RAISE NOTICE 'Created Airlock Item: %', v_item_id;

    -- 4. Execute RPC
    PERFORM public.commit_airlock_item(v_item_id);

    -- 5. Verify Ledger Transaction
    SELECT id INTO v_txn_id FROM public.ledger_transactions WHERE external_reference_id = v_item_id;

    IF v_txn_id IS NULL THEN
        RAISE EXCEPTION 'Ledger transaction not found for item %', v_item_id;
    END IF;

    RAISE NOTICE 'Ledger Transaction Created: %', v_txn_id;

    -- 6. Verify Ledger Lines
    -- Expect 2 lines
    IF (SELECT COUNT(*) FROM public.ledger_lines WHERE transaction_id = v_txn_id) != 2 THEN
        RAISE EXCEPTION 'Expected 2 ledger lines, found %', (SELECT COUNT(*) FROM public.ledger_lines WHERE transaction_id = v_txn_id);
    END IF;

    -- Verify Bank Line (Credit 50)
    IF NOT EXISTS (
        SELECT 1 FROM public.ledger_lines
        WHERE transaction_id = v_txn_id
        AND asset_id = v_asset_id
        AND amount = 50
        AND type = 'CREDIT'
    ) THEN
        RAISE EXCEPTION 'Bank line (Credit 50) missing or incorrect';
    END IF;

    -- Verify Expense Line (Debit 50)
    IF NOT EXISTS (
        SELECT 1 FROM public.ledger_lines
        WHERE transaction_id = v_txn_id
        AND asset_id = v_expense_asset_id
        AND amount = 50
        AND type = 'DEBIT'
    ) THEN
        RAISE EXCEPTION 'Expense line (Debit 50) missing or incorrect';
    END IF;

    -- 7. Verify Status Update
    IF (SELECT status FROM public.airlock_items WHERE id = v_item_id) != 'COMMITTED' THEN
        RAISE EXCEPTION 'Airlock item status not updated to COMMITTED';
    END IF;

    RAISE NOTICE '✅ Verification Successful!';

    -- Cleanup
    -- Cascade delete from airlock_items triggers SET NULL on txn, so we delete txn manually first to clean lines
    DELETE FROM public.ledger_lines WHERE transaction_id = v_txn_id;
    DELETE FROM public.ledger_transactions WHERE id = v_txn_id;
    DELETE FROM public.airlock_items WHERE id = v_item_id;
    DELETE FROM public.assets WHERE entity_id = v_entity_id;
    DELETE FROM public.entities WHERE id = v_entity_id;

END $$;
