-- ════════════════════════════════════════════════════════════════
-- STALE ROOM CLEANUP
-- ════════════════════════════════════════════════════════════════
-- Manual cleanup function — call this from an Edge Function or API
-- For pg_cron setup, run the cron.schedule() call separately in
-- SQL Editor AFTER enabling pg_cron from Database → Extensions.
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