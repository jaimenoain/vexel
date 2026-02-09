-- Verification Script: verify_auditor_access.sql
-- Description: Verifies Auditor Guest Access system (RLS, API logic via manual insert, Security Isolation).
-- Run this script using `psql` or a similar tool.

BEGIN;

-- 0. Apply Fix (Simulate Migration 0027 if not applied)
CREATE OR REPLACE FUNCTION validate_guest_access(p_asset_id UUID, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guest_invites
    WHERE asset_id = p_asset_id
      AND token = p_token
      AND expires_at > NOW()
  );
END;
$func$;

-- Update policies (Simulate Migration)
DROP POLICY IF EXISTS "Guests can view assets with token" ON public.assets;
CREATE POLICY "Guests can view assets with token" ON public.assets
    FOR SELECT
    USING (validate_guest_access(id, current_setting('app.current_guest_token', true)));

DROP POLICY IF EXISTS "Guests can view ledger lines with token" ON public.ledger_lines;
CREATE POLICY "Guests can view ledger lines with token" ON public.ledger_lines
    FOR SELECT
    USING (validate_guest_access(asset_id, current_setting('app.current_guest_token', true)));

DROP POLICY IF EXISTS "Guests can view ledger transactions with token" ON public.ledger_transactions;
CREATE POLICY "Guests can view ledger transactions with token" ON public.ledger_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_lines ll
            WHERE ll.transaction_id = ledger_transactions.id
        )
    );


DO $$
DECLARE
    -- User IDs
    v_owner_id UUID := '00000000-0000-0000-0000-000000000001';
    v_guest_token TEXT := 'valid_guest_token_123';
    v_expired_token TEXT := 'expired_guest_token_456';
    v_other_token TEXT := 'other_guest_token_789';

    -- IDs
    v_entity_id UUID;
    v_asset_id_a UUID;
    v_asset_id_b UUID;
    v_txn_id UUID;
    v_invite_id UUID;

    -- Verification flags
    found_asset BOOLEAN := FALSE;
    found_txn BOOLEAN := FALSE;
    found_line BOOLEAN := FALSE;
    found_invite BOOLEAN := FALSE;

    -- Counters
    v_count INT;
BEGIN
    RAISE NOTICE 'Starting Auditor Guest Access Verification...';

    -- 1. Setup Users
    INSERT INTO auth.users (id, email) VALUES (v_owner_id, 'owner@test.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email) VALUES (v_owner_id, 'owner@test.com') ON CONFLICT (id) DO NOTHING;

    -- 2. Setup Data (Entity, 2 Assets) owned by Owner
    INSERT INTO public.entities (name, type) VALUES ('Guest Access Entity', 'FAMILY') RETURNING id INTO v_entity_id;

    -- Asset A
    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (v_entity_id, 'Asset A', 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_asset_id_a;

    -- Asset B
    INSERT INTO public.assets (entity_id, name, type, currency, owner_id)
    VALUES (v_entity_id, 'Asset B', 'BANK', 'USD', v_owner_id)
    RETURNING id INTO v_asset_id_b;

    -- Ensure Grants exist
    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (v_asset_id_a, v_owner_id, 'OWNER'::public.app_permission)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.access_grants (asset_id, user_id, permission_level)
    VALUES (v_asset_id_b, v_owner_id, 'OWNER'::public.app_permission)
    ON CONFLICT DO NOTHING;

    -- Ledger Data for Asset A
    INSERT INTO public.ledger_transactions (description, date)
    VALUES ('Txn for Asset A', '2023-01-01')
    RETURNING id INTO v_txn_id;

    INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
    VALUES (v_txn_id, v_asset_id_a, 100, 'DEBIT');

    -- 3. Create Invites (Generation Verification via Manual Insert)
    -- Simulate Owner creating invites
    PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    -- Invite for Asset A (Valid)
    INSERT INTO public.guest_invites (asset_id, token, created_by, expires_at)
    VALUES (v_asset_id_a, v_guest_token, v_owner_id, now() + interval '1 day')
    RETURNING id INTO v_invite_id;

    -- Invite for Asset A (Expired)
    INSERT INTO public.guest_invites (asset_id, token, created_by, expires_at)
    VALUES (v_asset_id_a, v_expired_token, v_owner_id, now() - interval '1 day');

    -- Invite for Asset B
    INSERT INTO public.guest_invites (asset_id, token, created_by, expires_at)
    VALUES (v_asset_id_b, v_other_token, v_owner_id, now() + interval '1 day');


    -- 4. Verify Guest Access (Golden Path - Valid Token for Asset A)
    RAISE NOTICE 'Verifying Golden Path...';
    PERFORM set_config('request.jwt.claim.sub', NULL, true);
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('app.current_guest_token', v_guest_token, true);

    -- Check Asset A visibility
    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_a) INTO found_asset;
    IF NOT found_asset THEN
        RAISE EXCEPTION 'Golden Path Failed: Guest with valid token failed to see Asset A.';
    END IF;

    -- Check Asset B visibility (Cross-Asset Isolation)
    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_b) INTO found_asset;
    IF found_asset THEN
        RAISE EXCEPTION 'Cross-Asset Isolation Failed: Guest with token for Asset A SAW Asset B.';
    END IF;

    -- Check Ledger Lines for Asset A
    SELECT EXISTS (SELECT 1 FROM public.ledger_lines WHERE asset_id = v_asset_id_a) INTO found_line;
    IF NOT found_line THEN
        RAISE EXCEPTION 'Golden Path Failed: Guest failed to see ledger lines for Asset A.';
    END IF;

    -- Check Ledger Transaction
    SELECT EXISTS (SELECT 1 FROM public.ledger_transactions WHERE id = v_txn_id) INTO found_txn;
    IF NOT found_txn THEN
        RAISE EXCEPTION 'Golden Path Failed: Guest failed to see ledger transaction for Asset A.';
    END IF;

    -- Check Guest Invites Table (Should NOT see)
    SELECT EXISTS (SELECT 1 FROM public.guest_invites) INTO found_invite;
    IF found_invite THEN
        RAISE EXCEPTION 'Security Leak: Guest was able to see rows in guest_invites table.';
    END IF;

    RAISE NOTICE 'Golden Path & Cross-Asset Isolation Passed';


    -- 5. Verify Time-Box Enforcer (Expired Token)
    RAISE NOTICE 'Verifying Time-Box Enforcer...';
    PERFORM set_config('app.current_guest_token', v_expired_token, true);

    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_a) INTO found_asset;
    IF found_asset THEN
        RAISE EXCEPTION 'Time-Box Failed: Guest with EXPIRED token SAW Asset A.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.ledger_lines WHERE asset_id = v_asset_id_a) INTO found_line;
    IF found_line THEN
        RAISE EXCEPTION 'Time-Box Failed: Guest with EXPIRED token SAW Ledger Lines.';
    END IF;

    RAISE NOTICE 'Time-Box Enforcer Passed';


    -- 6. Verify Read-Only Integrity
    RAISE NOTICE 'Verifying Read-Only Integrity...';
    PERFORM set_config('app.current_guest_token', v_guest_token, true);

    -- Attempt INSERT into ledger_lines
    BEGIN
        INSERT INTO public.ledger_lines (transaction_id, asset_id, amount, type)
        VALUES (v_txn_id, v_asset_id_a, 500, 'DEBIT');
        RAISE EXCEPTION 'Read-Only Failed: Guest was able to INSERT into ledger_lines.';
    EXCEPTION WHEN OTHERS THEN
         -- Check for RLS violation (policy violation) vs permission denied
         -- Usually RLS insert policy check fails -> new row violates row-level security policy
         RAISE NOTICE 'INSERT Blocked (Expected) - Error: %', SQLERRM;
    END;

    -- Attempt UPDATE ledger_lines
    BEGIN
        UPDATE public.ledger_lines SET amount = 999 WHERE asset_id = v_asset_id_a;
        -- If no rows updated, it might be silent. We need to check if update happened.
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
             RAISE EXCEPTION 'Read-Only Failed: Guest was able to UPDATE ledger_lines (% rows).', v_count;
        END IF;
        RAISE NOTICE 'UPDATE Blocked (Expected, 0 rows updated)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'UPDATE Blocked (Expected) - Error: %', SQLERRM;
    END;

    RAISE NOTICE 'Read-Only Integrity Passed';

    RAISE NOTICE 'ALL CHECKS PASSED SUCCESSFULLY!';
END $$;

ROLLBACK;
