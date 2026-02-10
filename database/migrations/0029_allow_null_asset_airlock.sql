-- Migration: 0029_allow_null_asset_airlock.sql
-- Description: Allow asset_id to be NULL in airlock_items to support "Unknown Asset" ingestion.

ALTER TABLE public.airlock_items ALTER COLUMN asset_id DROP NOT NULL;
