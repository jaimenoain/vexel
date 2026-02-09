BEGIN;

DO $$
DECLARE
    v_entity_id UUID;
    v_owner_id UUID := '00000000-0000-0000-0000-000000000002'; -- Using a test user ID

    -- Assets
    v_bank_asset_id UUID;
    v_coffee_asset_id UUID;
    v_capital_call_asset_id UUID;
    v_transfer_asset_id UUID;
    v_investment_asset_id UUID;

    -- Transaction IDs
    v_txn1_id UUID;
    v_txn2_id UUID;
    v_txn3_id UUID;
    v_txn4_id UUID;
    v_txn5_id UUID;
    v_txn6_id UUID;

    -- Results
    v_oct_coffee_total NUMERIC;
    v_nov_coffee_total NUMERIC;
    v_count INTEGER;
    v_security_invoker TEXT[];

BEGIN
    RAISE NOTICE 'Starting View Logic Verification...';

    -- 1. Setup Data
    -- User (Ensure existence)
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'view_tester@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Entity
    INSERT INTO public.entities (name, type)
    VALUES ('View Test Entity', 'FAMILY')
    RETURNING id INTO v_entity_id;

    -- Assets
    -- Bank (Source of funds, Excluded by TYPE='BANK')
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Chase Checking', v_entity_id, 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_bank_asset_id;

    -- Coffee (Operating Expense, Should be INCLUDED)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Coffee', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_coffee_asset_id;

    -- Capital Call (Should be EXCLUDED by NAME)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Capital Call', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_capital_call_asset_id;

    -- Transfer (Should be EXCLUDED by NAME)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Transfer', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_transfer_asset_id;

    -- Investment (Should be EXCLUDED by NAME)
    INSERT INTO public.assets (name, entity_id, type, currency, owner_id)
    VALUES ('Investment', v_entity_id, 'EQUITY', 'USD', v_owner_id)
    RETURNING id INTO v_investment_asset_id;


    -- 2. Create Transactions

    -- --- OCTOBER 2023 ---

    -- TXN 1: Coffee 1 ($5) - Oct 10
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Coffee Oct 1', '2023-10-10')
    RETURNING id INTO v_txn1_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn1_id, v_coffee_asset_id, 5, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn1_id, v_bank_asset_id, 5, 'CREDIT');

    -- TXN 2: Coffee 2 ($5) - Oct 11
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Coffee Oct 2', '2023-10-11')
    RETURNING id INTO v_txn2_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn2_id, v_coffee_asset_id, 5, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn2_id, v_bank_asset_id, 5, 'CREDIT');

    -- TXN 3: Capital Call ($1000) - Oct 15 - Should be excluded
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Capital Call Oct', '2023-10-15')
    RETURNING id INTO v_txn3_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_capital_call_asset_id, 1000, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn3_id, v_bank_asset_id, 1000, 'CREDIT');


    -- --- NOVEMBER 2023 ---

    -- TXN 4: Coffee 3 ($5) - Nov 05
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Coffee Nov 1', '2023-11-05')
    RETURNING id INTO v_txn4_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn4_id, v_coffee_asset_id, 5, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn4_id, v_bank_asset_id, 5, 'CREDIT');

    -- TXN 5: Transfer ($500) - Nov 10 - Should be excluded
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Transfer Nov', '2023-11-10')
    RETURNING id INTO v_txn5_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn5_id, v_transfer_asset_id, 500, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn5_id, v_bank_asset_id, 500, 'CREDIT');

    -- TXN 6: Investment ($2000) - Nov 15 - Should be excluded
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Investment Nov', '2023-11-15')
    RETURNING id INTO v_txn6_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn6_id, v_investment_asset_id, 2000, 'DEBIT');
    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn6_id, v_bank_asset_id, 2000, 'CREDIT');


    -- 3. Assertions

    -- A. Aggregation: Oct Coffee should be 5 + 5 = 10
    SELECT total_outflow INTO v_oct_coffee_total
    FROM public.view_net_operating_outflow
    WHERE month = '2023-10-01' AND category = 'Coffee';

    IF v_oct_coffee_total IS NULL OR v_oct_coffee_total != 10 THEN
        RAISE EXCEPTION 'Assertion Failed: Oct Coffee Total expected 10, got %', v_oct_coffee_total;
    END IF;
    RAISE NOTICE 'Assertion Passed: Aggregation (Oct Coffee = 10)';


    -- B. Date Grouping: Nov Coffee should be 5 (distinct from Oct)
    SELECT total_outflow INTO v_nov_coffee_total
    FROM public.view_net_operating_outflow
    WHERE month = '2023-11-01' AND category = 'Coffee';

    IF v_nov_coffee_total IS NULL OR v_nov_coffee_total != 5 THEN
        RAISE EXCEPTION 'Assertion Failed: Nov Coffee Total expected 5, got %', v_nov_coffee_total;
    END IF;
    RAISE NOTICE 'Assertion Passed: Date Grouping (Nov Coffee = 5)';


    -- C. Filtering: Excluded Categories should not appear
    -- Check Capital Call
    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Capital Call') THEN
        RAISE EXCEPTION 'Assertion Failed: Capital Call should be excluded.';
    END IF;
    -- Check Transfer
    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Transfer') THEN
        RAISE EXCEPTION 'Assertion Failed: Transfer should be excluded.';
    END IF;
    -- Check Investment
    IF EXISTS (SELECT 1 FROM public.view_net_operating_outflow WHERE category = 'Investment') THEN
        RAISE EXCEPTION 'Assertion Failed: Investment should be excluded.';
    END IF;
    RAISE NOTICE 'Assertion Passed: Filtering (Excluded Categories missing)';


    -- D. Security: Verify security_invoker = true
    SELECT reloptions INTO v_security_invoker
    FROM pg_class
    WHERE relname = 'view_net_operating_outflow';

    IF NOT ('security_invoker=true' = ANY(v_security_invoker)) THEN
         RAISE EXCEPTION 'Assertion Failed: View not defined with security_invoker=true. Options: %', v_security_invoker;
    END IF;
    RAISE NOTICE 'Assertion Passed: Security (security_invoker=true)';


    RAISE NOTICE 'All View Logic Tests Passed Successfully!';

END $$;

ROLLBACK;
