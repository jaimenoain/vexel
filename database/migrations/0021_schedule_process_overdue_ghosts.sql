-- Migration: 0021_schedule_process_overdue_ghosts.sql
-- Description: Enable pg_cron and schedule process_overdue_ghosts to run daily at 00:00 UTC.

-- Enable the extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run daily at midnight UTC
-- format: cron.schedule(job_name, schedule, command)
SELECT cron.schedule(
    'process-overdue-ghosts',
    '0 0 * * *',
    'SELECT process_overdue_ghosts()'
);
