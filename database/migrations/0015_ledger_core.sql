-- Migration: 0015_ledger_core.sql
-- Description: Create Ledger architecture (Transactions and Lines) with Double-Entry constraints.

-- 1. Enum: ledger_entry_type
DO $$ BEGIN
    CREATE TYPE public.ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: ledger_transactions (The Header)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    date DATE NOT NULL,
    external_reference_id UUID REFERENCES public.airlock_items(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table: ledger_lines (The Detail)
CREATE TABLE IF NOT EXISTS public.ledger_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id),
    amount NUMERIC NOT NULL,
    type public.ledger_entry_type NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_lines ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- ledger_lines: SELECT
DROP POLICY IF EXISTS "Users can view ledger lines" ON public.ledger_lines;
CREATE POLICY "Users can view ledger lines" ON public.ledger_lines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = ledger_lines.asset_id
            AND ag.user_id = auth.uid()
        )
    );

-- ledger_lines: INSERT
-- Policy: Authenticated users can INSERT if they have EDITOR/OWNER permission on the asset.
DROP POLICY IF EXISTS "Users can insert ledger lines" ON public.ledger_lines;
CREATE POLICY "Users can insert ledger lines" ON public.ledger_lines
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR', 'OWNER')
        )
    );

-- ledger_transactions: SELECT
-- Policy: A user can SELECT rows from ledger_transactions if they have visibility on *any* of the child lines.
DROP POLICY IF EXISTS "Users can view ledger transactions" ON public.ledger_transactions;
CREATE POLICY "Users can view ledger transactions" ON public.ledger_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_lines ll
            JOIN public.access_grants ag ON ll.asset_id = ag.asset_id
            WHERE ll.transaction_id = ledger_transactions.id
            AND ag.user_id = auth.uid()
        )
    );

-- ledger_transactions: INSERT
-- Policy: Authenticated users can INSERT.
DROP POLICY IF EXISTS "Users can insert ledger transactions" ON public.ledger_transactions;
CREATE POLICY "Users can insert ledger transactions" ON public.ledger_transactions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- 6. Trigger: Conservation of Value
CREATE OR REPLACE FUNCTION public.check_ledger_balance()
RETURNS TRIGGER AS $$
DECLARE
    txn_id UUID;
    balance NUMERIC;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        txn_id := OLD.transaction_id;
    ELSE
        txn_id := NEW.transaction_id;
    END IF;

    -- Sum of amount for the transaction
    -- If no lines exist (e.g. all deleted), sum is NULL -> 0.
    SELECT COALESCE(SUM(amount), 0) INTO balance
    FROM public.ledger_lines
    WHERE transaction_id = txn_id;

    IF balance <> 0 THEN
        RAISE EXCEPTION 'Ledger transaction % is not balanced. Sum is %. Transaction must sum to 0.', txn_id, balance;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_ledger_balance ON public.ledger_lines;
CREATE CONSTRAINT TRIGGER validate_ledger_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.ledger_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_ledger_balance();
