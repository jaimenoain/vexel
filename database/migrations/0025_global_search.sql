-- Migration: 0025_global_search.sql
-- Description: Implement Global Search using pg_trgm and a secure RPC function.

-- 1. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Indexes
-- GIN indexes for fuzzy search performance.
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON public.assets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_description_trgm ON public.ledger_transactions USING GIN (description gin_trgm_ops);

-- 3. Create Search Function
CREATE OR REPLACE FUNCTION public.search_global(search_term TEXT)
RETURNS TABLE (
    id UUID,
    type TEXT,
    label TEXT,
    details TEXT,
    url_path TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        'ASSET'::TEXT as type,
        a.name as label,
        (a.type::TEXT || ' - ' || a.currency) as details,
        ('/assets/' || a.id) as url_path
    FROM public.assets a
    WHERE a.name ILIKE ('%' || search_term || '%')

    UNION ALL

    SELECT
        lt.id,
        'TRANSACTION'::TEXT as type,
        lt.description as label,
        lt.date::TEXT as details,
        ('/transactions/' || lt.id) as url_path
    FROM public.ledger_transactions lt
    WHERE lt.description ILIKE ('%' || search_term || '%');
END;
$$;
