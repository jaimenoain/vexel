-- Migration: 0018_ghost_matching.sql
-- Description: Add transaction_id to ghost_entries and update commit_airlock_item RPC to return UUID and fix amount sign.

-- 1. Add transaction_id to ghost_entries
DO $$ BEGIN
    ALTER TABLE public.ghost_entries
    ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Update commit_airlock_item RPC
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
    t_asset_id UUID;
    item_entity_id UUID;
    payload_txns JSONB;
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

    -- 3. Prepare Header Data from first transaction
    txn_data := payload_txns->0;

    -- Handle date parsing safely? JSONB -> text -> date
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

    -- 5. Helper: Get Entity ID for Asset Lookup
    SELECT entity_id INTO item_entity_id FROM public.assets WHERE id = item.asset_id;
    IF item_entity_id IS NULL THEN
        RAISE EXCEPTION 'Asset % not found or has no entity_id', item.asset_id;
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

        -- Resolve Asset ID
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

        -- Case C: Fallback to item.asset_id
        IF t_asset_id IS NULL THEN
            t_asset_id := item.asset_id;
        END IF;

        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
        VALUES (
            txn_header_id,
            t_asset_id,
            t_amount, -- FIX: Store signed amount to satisfy ledger balance check
            CASE WHEN t_amount > 0 THEN 'DEBIT'::public.ledger_entry_type ELSE 'CREDIT'::public.ledger_entry_type END
        );
    END LOOP;

    -- 7. Update Status
    UPDATE public.airlock_items SET status = 'COMMITTED' WHERE id = item_id;

    RETURN txn_header_id;

END;
$$;
