-- Migration: 0036_documents_module.sql
-- Description: Create documents table for long-term file storage and linking to users.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size BIGINT,
    mime_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Users can manage their own documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;

CREATE POLICY "Users can manage their own documents" ON public.documents
    FOR ALL
    USING (auth.uid() = user_id);

-- 4. Create Index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
