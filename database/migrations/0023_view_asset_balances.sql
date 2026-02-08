-- Migration: 0023_view_asset_balances.sql
-- Description: Create a view to calculate the live balance of every Asset.

CREATE OR REPLACE VIEW public.view_asset_balances
WITH (security_invoker = true)
AS
SELECT
    asset_id,
    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) as balance
FROM
    public.ledger_lines
GROUP BY
    asset_id;
