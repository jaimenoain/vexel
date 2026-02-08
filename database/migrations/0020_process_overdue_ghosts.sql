-- Migration: 0020_process_overdue_ghosts.sql
-- Description: Create function to identify stale ghost entries and convert them into governance tasks.

CREATE OR REPLACE FUNCTION process_overdue_ghosts()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    ghost_record RECORD;
BEGIN
    -- Iterate through PENDING ghost entries older than 60 days
    FOR ghost_record IN
        SELECT * FROM public.ghost_entries
        WHERE status = 'PENDING'
        AND expected_date < (CURRENT_DATE - INTERVAL '60 days')
        FOR UPDATE
    LOOP
        -- Step A: Update the ghost_entries status to 'OVERDUE'
        UPDATE public.ghost_entries
        SET status = 'OVERDUE',
            updated_at = NOW()
        WHERE id = ghost_record.id;

        -- Step B: Insert a new row into governance_tasks
        INSERT INTO public.governance_tasks (
            asset_id,
            title,
            priority,
            source_ghost_id,
            status
        ) VALUES (
            ghost_record.asset_id,
            'Missing Proof for ' || ghost_record.description,
            'HIGH',
            ghost_record.id,
            'OPEN'
        );

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;
