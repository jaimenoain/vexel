-- Verification: Verify that the process_overdue_ghosts job is scheduled.

-- Check if the job exists in cron.job
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM
    cron.job
WHERE
    jobname = 'process-overdue-ghosts'
    OR command = 'SELECT process_overdue_ghosts()';
