-- Migration: 0005_entities_and_assets.sql
-- Description: Create entities and assets tables with strict typing and relationships.

-- 1. Enums
-- Re-create Enums to ensure strict adherence to requirements.
-- CASCADE will drop columns that depend on these types, so we must be prepared to re-add them.
DROP TYPE IF EXISTS entity_type CASCADE;
CREATE TYPE entity_type AS ENUM ('FAMILY', 'HOLDING', 'COMPANY');

DROP TYPE IF EXISTS asset_type CASCADE;
CREATE TYPE asset_type AS ENUM ('BANK', 'PROPERTY', 'EQUITY');

-- 2. Table: entities
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type entity_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- If table existed and type was dropped (via CASCADE), the column 'type' is gone. We must ensure it exists.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entities' AND column_name = 'type') THEN
        ALTER TABLE public.entities ADD COLUMN type entity_type NOT NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- 3. Table: assets
-- (Note: assets might exist from 0003_access_grants.sql)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type asset_type NOT NULL,
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update columns if table already existed
DO $$
BEGIN
    -- entity_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'entity_id') THEN
        ALTER TABLE public.assets ADD COLUMN entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE;
    END IF;
    -- Enforce NOT NULL
    ALTER TABLE public.assets ALTER COLUMN entity_id SET NOT NULL;

    -- name (ensure NOT NULL)
    ALTER TABLE public.assets ALTER COLUMN name SET NOT NULL;

    -- type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'type') THEN
        ALTER TABLE public.assets ADD COLUMN type asset_type NOT NULL;
    END IF;

    -- currency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'currency') THEN
        ALTER TABLE public.assets ADD COLUMN currency CHAR(3);
    END IF;
    ALTER TABLE public.assets ALTER COLUMN currency SET NOT NULL;

    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'updated_at') THEN
        ALTER TABLE public.assets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Ensure default ID uses uuid_generate_v4() as requested
ALTER TABLE public.entities ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.assets ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
