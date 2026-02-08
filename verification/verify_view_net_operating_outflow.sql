BEGIN;

DO $$
DECLARE
    v_entity_id UUID;
    v_owner_id UUID := '00000000-0000-0000-0000-000000000002';

    -- Assets
    v_bank_asset_id UUID;
    v_utilities_asset_id UUID;
    v_travel_asset_id UUID;
    v_capital_call_asset_id UUID;
    v_property_asset_id UUID;

    -- Transaction IDs
    v_txn1_id UUID;
    v_txn2_id UUID;
    v_txn3_id UUID;

    -- Results
    v_count INTEGER;
    v_utilities_total NUMERIC;
    v_travel_total NUMERIC;
BEGIN
    RAISE NOTICE 'Starting View Verification...';

    -- 1. Setup Data
    -- User
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'view_tester@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Entity
    INSERT INTO public.entities (name, type)
    VALUES ('View Test Entity', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- Assets
    -- Bank (Should be excluded by TYPE='BANK')
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Chase Checking', v_entity_id, 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_bank_asset_id;

    -- Utilities (Should be INCLUDED, type='EQUITY')
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Utilities', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_utilities_asset_id;

    -- Travel (Should be INCLUDED, type='EQUITY')
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Travel', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_travel_asset_id;

    -- Capital Call (Should be EXCLUDED by NAME)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Capital Call', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_capital_call_asset_id;

    -- Property Asset (Should be EXCLUDED by TYPE='PROPERTY')
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Beach House', v_entity_id, 'PROPERTY', 'USD', v_owner_id)
    RETURNING id INTO v_property_asset_id;

    -- 2. Create Transactions

    -- TXN 1: Utilities Bill ($100)
    -- Debit Utilities $100
    -- Credit Bank $100
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Utilities Bill', '2023-10-15')
    RETURNING id INTO v_txn1_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn1_id, v_utilities_asset_id, 100, 'DEBIT');

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn1_id, v_bank_asset_id, 100, 'CREDIT');


    -- TXN 2: Travel Expense ($200)
    -- Debit Travel $200
    -- Credit Bank $200
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Flight Ticket', '2023-10-20')
    RETURNING id INTO v_txn2_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn2_id, v_travel_asset_id, 200, 'DEBIT');

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn2_id, v_bank_asset_id, 200, 'CREDIT');


    -- TXN 3: Capital Call ($5000) - Should be excluded
    -- Debit Capital Call $5000
    -- Credit Bank $5000
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Capital Call Payment', '2023-10-25')
    RETURNING id INTO v_txn3_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_capital_call_asset_id, 5000, 'DEBIT');

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_bank_asset_id, 5000, 'CREDIT');


    -- TXN 4: Property Purchase (Capitalized) - Should be excluded
    -- Debit Property $500
    -- Credit Bank $500
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Property Upgrade', '2023-10-26')
    RETURNING id INTO v_txn3_id; -- Reuse variable

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_property_asset_id, 500, 'DEBIT');

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_bank_asset_id, 500, 'CREDIT');


    -- TXN 5: Refund on Travel ($50)
    -- Debit Bank $50
    -- Credit Travel $50
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Flight Refund', '2023-10-28')
    RETURNING id INTO v_txn3_id; -- Reuse

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_bank_asset_id, 50, 'DEBIT');

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_travel_asset_id, 50, 'CREDIT');


    -- 3. Validate View Output

    -- Check total count of rows for Oct 2023
    SELECT COUNT(*) INTO v_count
    FROM public.view_net_operating_outflow
    WHERE month = '2023-10-01';

    -- Expected:
    -- Utilities: 100
    -- Travel: 200 - 50 = 150
    -- Capital Call: Excluded
    -- Property: Excluded
    -- Bank: Excluded
    -- Total rows: 2 (Utilities, Travel)

    IF v_count != 2 THEN
        RAISE EXCEPTION 'Assertion Failed: Expected 2 rows, got %', v_count;
    END IF;
    RAISE NOTICE 'Assertion Passed: Correct number of rows.';

    -- Check Utilities Amount
    SELECT total_outflow INTO v_utilities_total
    FROM public.view_net_operating_outflow
    WHERE month = '2023-10-01' AND category = 'Utilities';

    IF v_utilities_total != 100 THEN
         RAISE EXCEPTION 'Assertion Failed: Utilities Total expected 100, got %', v_utilities_total;
    END IF;
    RAISE NOTICE 'Assertion Passed: Utilities amount correct.';

    -- Check Travel Amount (Net)
    SELECT total_outflow INTO v_travel_total
    FROM public.view_net_operating_outflow
    WHERE month = '2023-10-01' AND category = 'Travel';

    IF v_travel_total != 150 THEN
         RAISE EXCEPTION 'Assertion Failed: Travel Total expected 150 (200-50), got %', v_travel_total;
    END IF;
    RAISE NOTICE 'Assertion Passed: Travel Net amount correct.';

    -- Verify Exclusions
    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Capital Call') THEN
        RAISE EXCEPTION 'Assertion Failed: Capital Call should be excluded.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Chase Checking') THEN
        RAISE EXCEPTION 'Assertion Failed: Bank Account should be excluded.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Beach House') THEN
        RAISE EXCEPTION 'Assertion Failed: Property Asset should be excluded.';
    END IF;

    RAISE NOTICE 'All View Logic Tests Passed!';

END $$;

ROLLBACK;
