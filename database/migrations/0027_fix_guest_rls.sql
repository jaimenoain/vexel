-- Migration: 0027_fix_guest_rls.sql
-- Description: Fix RLS policies for guest access by using a SECURITY DEFINER function to validate tokens.

-- 1. Create SECURITY DEFINER function to validate guest access
-- This function bypasses RLS on guest_invites to check if a valid token exists for the asset.
CREATE OR REPLACE FUNCTION validate_guest_access(p_asset_id UUID, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guest_invites
    WHERE asset_id = p_asset_id
      AND token = p_token
      AND expires_at > NOW()
  );
END;
$$;

-- 2. Update RLS for Assets
DROP POLICY IF EXISTS "Guests can view assets with token" ON public.assets;
CREATE POLICY "Guests can view assets with token" ON public.assets
    FOR SELECT
    USING (
        validate_guest_access(id, current_setting('app.current_guest_token', true))
    );

-- 3. Update RLS for Ledger Lines
DROP POLICY IF EXISTS "Guests can view ledger lines with token" ON public.ledger_lines;
CREATE POLICY "Guests can view ledger lines with token" ON public.ledger_lines
    FOR SELECT
    USING (
        validate_guest_access(asset_id, current_setting('app.current_guest_token', true))
    );

-- 4. Update RLS for Ledger Transactions
DROP POLICY IF EXISTS "Guests can view ledger transactions with token" ON public.ledger_transactions;
CREATE POLICY "Guests can view ledger transactions with token" ON public.ledger_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_lines ll
            WHERE ll.transaction_id = ledger_transactions.id
            -- We rely on ledger_lines RLS here, which calls validate_guest_access.
            -- This simplifies the policy and avoids joining guest_invites again.
        )
    );
