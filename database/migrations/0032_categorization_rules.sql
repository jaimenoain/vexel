-- Migration: 0032_categorization_rules.sql
-- Description: Create categorization_rules table for bulk categorization rules engine.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_pattern TEXT NOT NULL CHECK (length(trigger_pattern) > 0),
    action_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON public.categorization_rules(user_id);

-- 3. Enable RLS
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies

-- SELECT: Users can view their own rules
DROP POLICY IF EXISTS "Users can view own categorization rules" ON public.categorization_rules;
CREATE POLICY "Users can view own categorization rules" ON public.categorization_rules
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Users can create rules for themselves
DROP POLICY IF EXISTS "Users can create own categorization rules" ON public.categorization_rules;
CREATE POLICY "Users can create own categorization rules" ON public.categorization_rules
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own rules
DROP POLICY IF EXISTS "Users can delete own categorization rules" ON public.categorization_rules;
CREATE POLICY "Users can delete own categorization rules" ON public.categorization_rules
    FOR DELETE
    USING (auth.uid() = user_id);
