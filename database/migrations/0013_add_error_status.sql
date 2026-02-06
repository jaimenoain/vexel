-- Migration: 0013_add_error_status.sql
-- Description: Add 'ERROR' to airlock_status enum

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'airlock_status' AND e.enumlabel = 'ERROR') THEN
        ALTER TYPE public.airlock_status ADD VALUE 'ERROR';
    END IF;
END $$;
