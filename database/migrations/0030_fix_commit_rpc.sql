-- Migration: 0030_fix_commit_rpc.sql
-- Description: Update commit_airlock_item to create double-entry ledger records (Allocation + Source).

-- 1. Add group_id to ledger_lines to link legs of a transaction
DO $$ BEGIN
    ALTER TABLE public.ledger_lines ADD COLUMN IF NOT EXISTS group_id UUID;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DROP FUNCTION IF EXISTS public.commit_airlock_item(uuid);

CREATE OR REPLACE FUNCTION public.commit_airlock_item(item_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    item RECORD;
    txn_header_id UUID;
    txn_data JSONB;
    t_date DATE;
    t_desc TEXT;
    t_amount NUMERIC;
    t_category TEXT;
    t_asset_id UUID; -- Target Asset
    source_asset_id UUID; -- Source Asset
    item_entity_id UUID;
    payload_txns JSONB;
    v_group_id UUID;
BEGIN
    -- 1. Fetch item and validate
    SELECT * INTO item FROM public.airlock_items WHERE id = item_id FOR UPDATE;

    IF item IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    -- Idempotency check
    IF item.status = 'COMMITTED' THEN
        SELECT id INTO txn_header_id FROM public.ledger_transactions WHERE external_reference_id = item_id;
        RETURN txn_header_id;
    END IF;

    IF item.status != 'REVIEW_NEEDED' AND item.status != 'READY_TO_COMMIT' THEN
         RAISE EXCEPTION 'Item status must be REVIEW_NEEDED or READY_TO_COMMIT (current: %)', item.status;
    END IF;

    IF item.traffic_light = 'RED' THEN
        RAISE EXCEPTION 'Cannot commit items with RED status';
    END IF;

    -- 2. Extract payload
    IF item.ai_payload IS NULL OR NOT (item.ai_payload ? 'transactions') THEN
        RAISE EXCEPTION 'Invalid payload: missing transactions array';
    END IF;

    payload_txns := item.ai_payload->'transactions';

    IF jsonb_array_length(payload_txns) = 0 THEN
         RAISE EXCEPTION 'No transactions in payload';
    END IF;

    -- Validate Source Asset
    IF item.asset_id IS NULL THEN
        RAISE EXCEPTION 'Source asset (item.asset_id) is missing. Cannot create double-entry transaction.';
    END IF;
    source_asset_id := item.asset_id;

    -- 3. Prepare Header Data from first transaction
    txn_data := payload_txns->0;

    -- Handle date parsing safely
    BEGIN
        t_date := (txn_data->>'date')::DATE;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid date format in payload: %', (txn_data->>'date');
    END;

    t_desc := txn_data->>'description';
    IF t_desc IS NULL OR t_desc = '' THEN
        t_desc := 'Airlock Commit ' || item_id;
    END IF;

    -- 4. Insert Header
    INSERT INTO public.ledger_transactions (date, description, external_reference_id)
    VALUES (t_date, t_desc, item_id)
    RETURNING id INTO txn_header_id;

    -- 5. Helper: Get Entity ID for Asset Lookup (Target lookup needs entity context)
    SELECT entity_id INTO item_entity_id FROM public.assets WHERE id = source_asset_id;
    IF item_entity_id IS NULL THEN
        RAISE EXCEPTION 'Asset % not found or has no entity_id', source_asset_id;
    END IF;

    -- 6. Insert Lines
    FOR txn_data IN SELECT * FROM jsonb_array_elements(payload_txns)
    LOOP
        -- Handle amount
        BEGIN
            t_amount := (txn_data->>'amount')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid amount format in payload: %', (txn_data->>'amount');
        END;

        IF t_amount IS NULL THEN
             RAISE EXCEPTION 'Amount is missing in payload transaction';
        END IF;

        -- Skip zero amounts
        IF t_amount = 0 THEN
            CONTINUE;
        END IF;

        t_category := txn_data->>'category';

        -- Resolve Target Asset ID
        t_asset_id := NULL;

        -- Case A: Category is a valid UUID
        IF t_category IS NOT NULL AND t_category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            SELECT id INTO t_asset_id FROM public.assets WHERE id = t_category::UUID;
        END IF;

        -- Case B: Category is text, lookup by name
        IF t_asset_id IS NULL AND t_category IS NOT NULL AND t_category != '' THEN
            SELECT id INTO t_asset_id FROM public.assets
            WHERE name = t_category AND entity_id = item_entity_id;
        END IF;

        -- Case C: Fallback to source asset?
        IF t_asset_id IS NULL THEN
             t_asset_id := source_asset_id;
        END IF;

        -- Generate Group ID for this pair
        v_group_id := gen_random_uuid();

        -- Leg 1: The Allocation (Target Asset)
        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type, group_id)
        VALUES (
            txn_header_id,
            t_asset_id,
            t_amount,
            CASE WHEN t_amount > 0 THEN 'DEBIT'::public.ledger_entry_type ELSE 'CREDIT'::public.ledger_entry_type END,
            v_group_id
        );

        -- Leg 2: The Source (Source Asset)
        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type, group_id)
        VALUES (
            txn_header_id,
            source_asset_id,
            -t_amount, -- Negative value
            CASE WHEN -t_amount > 0 THEN 'DEBIT'::public.ledger_entry_type ELSE 'CREDIT'::public.ledger_entry_type END,
            v_group_id
        );

    END LOOP;

    -- 7. Update Status
    UPDATE public.airlock_items SET status = 'COMMITTED' WHERE id = item_id;

    RETURN txn_header_id;

END;
$$;
