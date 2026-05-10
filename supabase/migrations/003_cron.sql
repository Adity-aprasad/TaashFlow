-- ════════════════════════════════════════════════════════════════
-- STALE ROOM CLEANUP (pg_cron)
-- ════════════════════════════════════════════════════════════════
--
-- SETUP INSTRUCTIONS:
-- 1. Enable pg_cron extension in Supabase Dashboard:
--    Database → Extensions → search "pg_cron" → Enable
--
-- 2. Run this SQL in the Supabase SQL Editor:
--    (Remove the comment markers first)
--
-- 3. The cron job runs every 30 minutes and deletes:
--    - Rooms with no activity for 2+ hours
--    - This triggers CASCADE deletion of all related data
--
-- ────────────────────────────────────────────────────────────────

-- Uncomment and run manually in Supabase SQL Editor after enabling pg_cron:

/*

-- Enable the extension (if not done via Dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule stale room cleanup every 30 minutes
SELECT cron.schedule(
  'cleanup-stale-rooms',
  '*/30 * * * *',
  $$
    DELETE FROM rooms
    WHERE last_activity < NOW() - INTERVAL '2 hours';
  $$
);

-- Verify the job is scheduled
SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('cleanup-stale-rooms');

*/

-- ────────────────────────────────────────────────────────────────
-- ALTERNATIVE: Manual cleanup function (can be called via Edge Function or API)
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM rooms
  WHERE last_activity < NOW() - INTERVAL '2 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;