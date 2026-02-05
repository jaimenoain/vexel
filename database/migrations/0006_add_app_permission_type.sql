-- Create the ENUM type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_permission') THEN
        CREATE TYPE public.app_permission AS ENUM ('VIEW', 'EDIT');
    END IF;
END $$;

-- Alter the access_grants table to use the new type
DO $$
BEGIN
    -- Check if the column is already of the correct type to avoid errors on re-run
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'access_grants'
        AND column_name = 'access_level'
        AND data_type = 'text'
    ) THEN
        -- Drop the existing CHECK constraint if it exists
        ALTER TABLE public.access_grants DROP CONSTRAINT IF EXISTS access_grants_access_level_check;

        -- Change the column type
        ALTER TABLE public.access_grants
            ALTER COLUMN access_level TYPE public.app_permission
            USING access_level::public.app_permission;
    END IF;
END $$;

-- Ensure the unique constraint on (asset_id, user_id) exists
DO $$
BEGIN
    -- Check if a unique constraint with the standard name exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'access_grants_asset_id_user_id_key'
    ) THEN
        -- If not, verify if ANY unique constraint covers these columns to avoid duplication?
        -- For simplicity and robustness, we enforce the named constraint.
        ALTER TABLE public.access_grants ADD CONSTRAINT access_grants_asset_id_user_id_key UNIQUE (asset_id, user_id);
    END IF;
END $$;
