-- Create Enums
DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('FAMILY', 'TRUST', 'COMPANY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_type AS ENUM ('BANK', 'REAL_ESTATE', 'STOCK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create entities table
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type entity_type DEFAULT 'FAMILY',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on entities
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Add columns to assets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'entity_id') THEN
        ALTER TABLE public.assets ADD COLUMN entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'type') THEN
        ALTER TABLE public.assets ADD COLUMN type asset_type;
    END IF;
END $$;

-- Policies for Entities (Basic)
-- Allow authenticated users to view entities (Refine as needed based on strict access control later)
CREATE POLICY "Users can view entities" ON public.entities
    FOR SELECT
    USING (auth.role() = 'authenticated');
