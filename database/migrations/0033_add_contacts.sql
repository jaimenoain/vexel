-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policies for contacts
-- Allow authenticated users to view contacts
DROP POLICY IF EXISTS "Users can view contacts" ON public.contacts;
CREATE POLICY "Users can view contacts" ON public.contacts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create/update contacts
DROP POLICY IF EXISTS "Users can manage contacts" ON public.contacts;
CREATE POLICY "Users can manage contacts" ON public.contacts
    FOR ALL USING (auth.role() = 'authenticated');


-- Add contact_id to ledger_transactions
ALTER TABLE public.ledger_transactions
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Add contact_id to airlock_items
ALTER TABLE public.airlock_items
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
