-- Migration: 0007_add_owner_enum.sql
-- Description: Add 'OWNER' to app_permission ENUM.
-- This is separated from the policy migration to avoid "unsafe use of new enum value" errors
-- when running in a single transaction block.

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'OWNER';
