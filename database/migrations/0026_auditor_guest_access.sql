-- Migration: 0026_auditor_guest_access.sql
-- Description: Implement Auditor Guest Access via guest_invites table and updated RLS.

-- 1. Create table guest_invites
CREATE TABLE IF NOT EXISTS public.guest_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT guest_invites_token_key UNIQUE (token)
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_guest_invites_token ON public.guest_invites(token);
CREATE INDEX IF NOT EXISTS idx_guest_invites_asset_id ON public.guest_invites(asset_id);

-- Enable RLS
ALTER TABLE public.guest_invites ENABLE ROW LEVEL SECURITY;

-- 2. RLS for guest_invites

-- Policy: Owners and Editors can view invites for their assets.
DROP POLICY IF EXISTS "Owners and Editors can view invites" ON public.guest_invites;
CREATE POLICY "Owners and Editors can view invites" ON public.guest_invites
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = guest_invites.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
        )
    );

-- Policy: Owners and Editors can create invites.
DROP POLICY IF EXISTS "Owners and Editors can create invites" ON public.guest_invites;
CREATE POLICY "Owners and Editors can create invites" ON public.guest_invites
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = guest_invites.asset_id -- explicitly reference the new row's asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
        )
    );

-- Policy: Owners and Editors can delete/revoke invites.
DROP POLICY IF EXISTS "Owners and Editors can delete invites" ON public.guest_invites;
CREATE POLICY "Owners and Editors can delete invites" ON public.guest_invites
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.access_grants ag
            WHERE ag.asset_id = guest_invites.asset_id
            AND ag.user_id = auth.uid()
            AND ag.permission_level IN ('EDITOR'::public.app_permission, 'OWNER'::public.app_permission)
        )
    );

-- 3. Update RLS for Assets

-- New Policy for Guests
CREATE POLICY "Guests can view assets with token" ON public.assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.guest_invites gi
            WHERE gi.asset_id = assets.id
            AND gi.token = current_setting('app.current_guest_token', true)
            AND gi.expires_at > now()
        )
    );

-- 4. Update RLS for Ledger Lines

-- New Policy for Guests
CREATE POLICY "Guests can view ledger lines with token" ON public.ledger_lines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.guest_invites gi
            WHERE gi.asset_id = ledger_lines.asset_id
            AND gi.token = current_setting('app.current_guest_token', true)
            AND gi.expires_at > now()
        )
    );

-- 5. Update RLS for Ledger Transactions

-- New Policy for Guests
CREATE POLICY "Guests can view ledger transactions with token" ON public.ledger_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_lines ll
            JOIN public.guest_invites gi ON ll.asset_id = gi.asset_id
            WHERE ll.transaction_id = ledger_transactions.id
            AND gi.token = current_setting('app.current_guest_token', true)
            AND gi.expires_at > now()
        )
    );
