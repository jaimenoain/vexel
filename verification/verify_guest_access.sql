BEGIN;

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

    rec RECORD;
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

    -- Ensure Grants exist (Manual insertion to be safe against trigger behavior in test)
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

    -- 3. Create Invites
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


    -- 4. Verify Owner Access to Invites
    SELECT EXISTS (SELECT 1 FROM public.guest_invites WHERE id = v_invite_id) INTO found_invite;
    IF NOT found_invite THEN
        RAISE EXCEPTION 'Owner failed to see the invite they created.';
    END IF;
    RAISE NOTICE 'Owner Access Verification Passed';


    -- 5. Verify Guest Access (Valid Token for Asset A)
    -- Simulate Guest: No Auth User, but Token Set
    -- Note: Role 'anon' typically has SELECT permissions on public tables in Supabase.
    PERFORM set_config('request.jwt.claim.sub', NULL, true);
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('app.current_guest_token', v_guest_token, true);

    -- Check Asset A visibility
    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_a) INTO found_asset;
    IF NOT found_asset THEN
        RAISE EXCEPTION 'Guest with valid token failed to see Asset A.';
    END IF;

    -- Check Asset B visibility (Should NOT see)
    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_b) INTO found_asset;
    IF found_asset THEN
        RAISE EXCEPTION 'Guest with token for Asset A SAW Asset B (Leakage).';
    END IF;

    -- Check Ledger Lines for Asset A
    SELECT EXISTS (SELECT 1 FROM public.ledger_lines WHERE asset_id = v_asset_id_a) INTO found_line;
    IF NOT found_line THEN
        RAISE EXCEPTION 'Guest failed to see ledger lines for Asset A.';
    END IF;

    -- Check Ledger Transaction
    SELECT EXISTS (SELECT 1 FROM public.ledger_transactions WHERE id = v_txn_id) INTO found_txn;
    IF NOT found_txn THEN
        RAISE EXCEPTION 'Guest failed to see ledger transaction for Asset A.';
    END IF;

    -- Check Guest Invites Table (Should NOT see)
    SELECT EXISTS (SELECT 1 FROM public.guest_invites) INTO found_invite;
    IF found_invite THEN
        RAISE EXCEPTION 'Guest was able to see rows in guest_invites table (Leakage).';
    END IF;

    RAISE NOTICE 'Valid Guest Access Verification Passed';


    -- 6. Verify Guest Access (Expired Token)
    PERFORM set_config('app.current_guest_token', v_expired_token, true);

    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_a) INTO found_asset;
    IF found_asset THEN
        RAISE EXCEPTION 'Guest with EXPIRED token SAW Asset A.';
    END IF;

    RAISE NOTICE 'Expired Token Verification Passed';


    -- 7. Verify Guest Access (Invalid Token)
    PERFORM set_config('app.current_guest_token', 'INVALID_TOKEN_XYZ', true);

    SELECT EXISTS (SELECT 1 FROM public.assets WHERE id = v_asset_id_a) INTO found_asset;
    IF found_asset THEN
        RAISE EXCEPTION 'Guest with INVALID token SAW Asset A.';
    END IF;

    RAISE NOTICE 'Invalid Token Verification Passed';

    RAISE NOTICE 'ALL CHECKS PASSED SUCCESSFULLY!';
END $$;

ROLLBACK;
