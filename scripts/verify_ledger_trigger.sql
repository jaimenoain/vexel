DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
    v_txn_id UUID;
BEGIN
    RAISE NOTICE 'Starting Ledger Verification...';

    -- 1. Create Entity
    INSERT INTO public.entities (name, type)
    VALUES ('Test Verification Entity', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- 2. Create Asset
    INSERT INTO public.assets (name, type, currency, entity_id)
    VALUES ('Test Verification Asset', 'BANK', 'USD', v_entity_id)
    RETURNING id INTO v_asset_id;

    -- 3. Test Case 1: Unbalanced Transaction
    RAISE NOTICE 'Test 1: Attempting Unbalanced Transaction (Should Fail)...';

    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Test Unbalanced', CURRENT_DATE)
    RETURNING id INTO v_txn_id;

    BEGIN
        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
        VALUES
            (v_txn_id, v_asset_id, 100, 'DEBIT'),
            (v_txn_id, v_asset_id, 50, 'CREDIT');

        -- Force constraint check immediately to catch the error
        SET CONSTRAINTS public.validate_ledger_balance IMMEDIATE;

        -- If we reach here, it failed to block
        RAISE EXCEPTION 'Test Failed: Unbalanced transaction was incorrectly accepted.';
    EXCEPTION WHEN OTHERS THEN
        -- Check if it is the specific error we expect?
        -- "Ledger transaction ... is not balanced."
        IF SQLERRM LIKE '%is not balanced%' THEN
            RAISE NOTICE '✅ Success: Caught expected error: %', SQLERRM;
        ELSE
            RAISE NOTICE '⚠️  Caught unexpected error: %', SQLERRM;
            RAISE; -- Re-raise if it's not our constraint error
        END IF;
    END;

    -- Cleanup failed transaction wrapper
    DELETE FROM public.ledger_transactions WHERE id = v_txn_id;


    -- 4. Test Case 2: Balanced Transaction
    RAISE NOTICE 'Test 2: Attempting Balanced Transaction (Should Succeed)...';

    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Test Balanced', CURRENT_DATE)
    RETURNING id INTO v_txn_id;

    BEGIN
        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
        VALUES
            (v_txn_id, v_asset_id, 100, 'DEBIT'),
            (v_txn_id, v_asset_id, -100, 'CREDIT');

        -- Force constraint check
        SET CONSTRAINTS public.validate_ledger_balance IMMEDIATE;

        RAISE NOTICE '✅ Success: Balanced transaction accepted.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Test Failed: Balanced transaction rejected. Error: %', SQLERRM;
    END;

    -- Cleanup
    DELETE FROM public.ledger_lines WHERE transaction_id = v_txn_id;
    DELETE FROM public.ledger_transactions WHERE id = v_txn_id;
    DELETE FROM public.assets WHERE id = v_asset_id;
    DELETE FROM public.entities WHERE id = v_entity_id;

    RAISE NOTICE 'Verification Complete.';
END $$;
