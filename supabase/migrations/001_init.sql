-- ════════════════════════════════════════════════════════════════
-- TAKHT PLATFORM — DATABASE SCHEMA
-- ════════════════════════════════════════════════════════════════
-- Game-agnostic schema. Game-specific data stored in JSONB columns.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- ROOMS TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text         UNIQUE NOT NULL CHECK (length(code) = 6),
  owner_id        uuid         NOT NULL,
  game_slug       text         NOT NULL,
  max_players     int          NOT NULL CHECK (max_players BETWEEN 2 AND 12),
  permission_mode text         NOT NULL DEFAULT 'owner'
                               CHECK (permission_mode IN ('owner', 'player')),
  status          text         NOT NULL DEFAULT 'lobby'
                               CHECK (status IN ('lobby', 'betting', 'playing', 'scoring', 'ended')),
  current_round   int          NOT NULL DEFAULT 0,
  game_settings   jsonb        NOT NULL DEFAULT '{}',
  last_activity   timestamptz  NOT NULL DEFAULT now(),
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity);

-- ────────────────────────────────────────────────────────────────
-- PLAYERS TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE players (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  auth_id         uuid         NOT NULL,
  display_name    text         NOT NULL CHECK (length(display_name) BETWEEN 3 AND 20),
  avatar_color    text         NOT NULL,
  is_ready        bool         NOT NULL DEFAULT false,
  is_eliminated   bool         NOT NULL DEFAULT false,
  is_spectator    bool         NOT NULL DEFAULT false,
  is_owner        bool         NOT NULL DEFAULT false,
  joined_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_players_auth ON players(auth_id);

-- ────────────────────────────────────────────────────────────────
-- ROUNDS TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE rounds (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number    int          NOT NULL,
  round_meta      jsonb        NOT NULL DEFAULT '{}',
  created_at      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

CREATE INDEX idx_rounds_room ON rounds(room_id);

-- ────────────────────────────────────────────────────────────────
-- BETS TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE bets (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        uuid         NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id       uuid         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  bet_amount      int          NULL,
  actual_hands    int          NULL,
  round_points    int          NULL,
  bet_meta        jsonb        NOT NULL DEFAULT '{}',
  submitted_at    timestamptz  NULL,
  UNIQUE(round_id, player_id)
);

CREATE INDEX idx_bets_round ON bets(round_id);
CREATE INDEX idx_bets_player ON bets(player_id);

-- ────────────────────────────────────────────────────────────────
-- SCORES TABLE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE scores (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  room_id         uuid         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  cumulative_score int         NOT NULL DEFAULT 0,
  last_updated    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(player_id, room_id)
);

CREATE INDEX idx_scores_room ON scores(room_id);
CREATE INDEX idx_scores_player ON scores(player_id);

-- ────────────────────────────────────────────────────────────────
-- AUTO-CLEANUP TRIGGER
-- When the last player leaves a room, auto-delete the room.
-- CASCADE handles cleanup of all related tables.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_empty_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM players WHERE room_id = OLD.room_id) = 0 THEN
    DELETE FROM rooms WHERE id = OLD.room_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_empty_room
AFTER DELETE ON players
FOR EACH ROW EXECUTE FUNCTION cleanup_empty_room();

-- ────────────────────────────────────────────────────────────────
-- ENABLE REALTIME
-- ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;