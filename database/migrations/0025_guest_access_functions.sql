-- Function to validate a guest token
-- Returns TRUE if the token exists and is not expired
CREATE OR REPLACE FUNCTION validate_guest_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS on guest_invites to check validity
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM guest_invites
    WHERE token = p_token
      AND expires_at > NOW()
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Function to get asset history for a guest
-- Sets the session variable for RLS and returns the history
CREATE OR REPLACE FUNCTION get_guest_asset_history(p_asset_id UUID, p_token TEXT)
RETURNS TABLE (
  id UUID,
  date DATE,
  description TEXT,
  amount NUMERIC,
  type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER -- Use Invoker rights to respect RLS on ledger tables
AS $$
BEGIN
  -- Set the guest token for RLS
  PERFORM set_config('app.current_guest_token', p_token, true);

  -- Return the history
  -- Join ledger_transactions and ledger_lines
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.description,
    l.amount,
    l.type::TEXT
  FROM ledger_transactions t
  JOIN ledger_lines l ON l.transaction_id = t.id
  WHERE l.asset_id = p_asset_id
  ORDER BY t.date DESC;
END;
$$;
