-- Migration: 0022_view_net_operating_outflow.sql
-- Description: Create view_net_operating_outflow for Dashboard Monthly Spend (Noise Filter).

CREATE OR REPLACE VIEW public.view_net_operating_outflow
WITH (security_invoker = true)
AS
SELECT
    DATE_TRUNC('month', lt.date)::DATE AS month,
    ll.asset_id,
    a.name AS category,
    SUM(
        CASE
            WHEN ll.type = 'DEBIT' THEN ll.amount
            ELSE -ll.amount
        END
    ) AS total_outflow
FROM
    public.ledger_lines ll
JOIN
    public.ledger_transactions lt ON ll.transaction_id = lt.id
JOIN
    public.assets a ON ll.asset_id = a.id
WHERE
    -- Exclude Balance Sheet Assets (Bank Accounts, Property)
    a.type NOT IN ('BANK', 'PROPERTY')
    AND
    -- Exclude specific Balance Sheet / Investment categories by name
    a.name NOT IN ('Capital Call', 'Distribution', 'Transfer', 'Investment', 'Opening Balance')
GROUP BY
    DATE_TRUNC('month', lt.date)::DATE,
    ll.asset_id,
    a.name;
