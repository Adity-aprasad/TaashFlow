-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- ROOMS POLICIES
-- ────────────────────────────────────────────────────────────────

-- Anyone can read rooms (needed for join by code)
CREATE POLICY "rooms_select_all"
ON rooms FOR SELECT
TO authenticated, anon
USING (true);

-- Authenticated users can create rooms
CREATE POLICY "rooms_insert_auth"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Owner can update their room
CREATE POLICY "rooms_update_owner"
ON rooms FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- Owner can delete their room
CREATE POLICY "rooms_delete_owner"
ON rooms FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────────
-- PLAYERS POLICIES
-- ────────────────────────────────────────────────────────────────

-- Players in same room can see each other
CREATE POLICY "players_select_same_room"
ON players FOR SELECT
TO authenticated, anon
USING (true);

-- Any authenticated user can join (insert themselves)
CREATE POLICY "players_insert_self"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_id);

-- Players can update their own row (ready state)
CREATE POLICY "players_update_self"
ON players FOR UPDATE
TO authenticated
USING (auth.uid() = auth_id);

-- Room owner can update any player in their room (kick/eliminate)
CREATE POLICY "players_update_owner"
ON players FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = players.room_id
    AND rooms.owner_id = auth.uid()
  )
);

-- Players can delete themselves (leave)
CREATE POLICY "players_delete_self"
ON players FOR DELETE
TO authenticated
USING (auth.uid() = auth_id);

-- Owner can delete (kick) players from their room
CREATE POLICY "players_delete_owner"
ON players FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = players.room_id
    AND rooms.owner_id = auth.uid()
  )
);

-- ────────────────────────────────────────────────────────────────
-- ROUNDS POLICIES
-- ────────────────────────────────────────────────────────────────

-- Players in room can read rounds
CREATE POLICY "rounds_select_room"
ON rounds FOR SELECT
TO authenticated, anon
USING (true);

-- Room owner can create/update rounds
CREATE POLICY "rounds_insert_owner"
ON rounds FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = rounds.room_id
    AND rooms.owner_id = auth.uid()
  )
);

CREATE POLICY "rounds_update_owner"
ON rounds FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = rounds.room_id
    AND rooms.owner_id = auth.uid()
  )
);

-- Allow deletion for cleanup
CREATE POLICY "rounds_delete_owner"
ON rounds FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = rounds.room_id
    AND rooms.owner_id = auth.uid()
  )
);

-- ────────────────────────────────────────────────────────────────
-- BETS POLICIES
-- ────────────────────────────────────────────────────────────────

-- Players in room can read bets
CREATE POLICY "bets_select_room"
ON bets FOR SELECT
TO authenticated, anon
USING (true);

-- Players can insert/update their own bets
CREATE POLICY "bets_insert_self"
ON bets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = bets.player_id
    AND players.auth_id = auth.uid()
  )
);

CREATE POLICY "bets_update_self"
ON bets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = bets.player_id
    AND players.auth_id = auth.uid()
  )
);

-- Room owner can insert/update bets for any player
CREATE POLICY "bets_insert_owner"
ON bets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players
    JOIN rooms ON rooms.id = players.room_id
    WHERE players.id = bets.player_id
    AND rooms.owner_id = auth.uid()
  )
);

CREATE POLICY "bets_update_owner"
ON bets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players
    JOIN rooms ON rooms.id = players.room_id
    WHERE players.id = bets.player_id
    AND rooms.owner_id = auth.uid()
  )
);

-- ────────────────────────────────────────────────────────────────
-- SCORES POLICIES
-- ────────────────────────────────────────────────────────────────

-- Anyone in room can read scores
CREATE POLICY "scores_select_room"
ON scores FOR SELECT
TO authenticated, anon
USING (true);

-- Room owner can insert/update scores
CREATE POLICY "scores_upsert_owner"
ON scores FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = scores.room_id
    AND rooms.owner_id = auth.uid()
  )
);

CREATE POLICY "scores_update_owner"
ON scores FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = scores.room_id
    AND rooms.owner_id = auth.uid()
  )
);

-- Players can upsert their own scores (for player mode)
CREATE POLICY "scores_upsert_self"
ON scores FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = scores.player_id
    AND players.auth_id = auth.uid()
  )
);

CREATE POLICY "scores_update_self"
ON scores FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = scores.player_id
    AND players.auth_id = auth.uid()
  )
);

-- Allow deletion for play again
CREATE POLICY "scores_delete_owner"
ON scores FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    WHERE rooms.id = scores.room_id
    AND rooms.owner_id = auth.uid()
  )
);