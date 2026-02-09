DO $$
BEGIN
    PERFORM transaction_id FROM public.ghost_entries LIMIT 1;
    RAISE NOTICE 'Column transaction_id exists';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column transaction_id does not exist';
END $$;
