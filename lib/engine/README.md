# Platform Engine — /lib/engine/

## Architecture

The engine layer handles all game-agnostic platform concerns:
- Anonymous authentication and session management
- Room lifecycle (create, join, leave, kick, ownership transfer)
- Realtime communication (presence, broadcast)
- Cleanup and reconnection logic

## Key Principle

**ZERO game-specific logic lives here.** The engine doesn't know what Takht is,
what scoring means, or how many cards are in a deck. It only knows about:
- Rooms with a `game_slug` field
- Players with states (ready, eliminated, spectator, owner)
- Rounds with `round_meta` JSONB
- Bets with `bet_meta` JSONB
- Scores with cumulative totals

## Realtime Channel Conventions

Each room gets one channel: `room:{room_code}`

The channel supports:
1. **Presence** — tracks who is online/offline
2. **Broadcast** — ephemeral game events (bets locked, phase changes)
3. **Postgres Changes** — persistent state updates (subscribed in page component)

## Room Lifecycle State Machine
```
┌─────────┐   force_start/   ┌─────────┐   reveal    ┌─────────┐
│  lobby  │ ───────────────→  │ betting │ ─────────→  │ playing │
└─────────┘   auto_start     └─────────┘             └─────────┘
│
┌─────────┐   confirm    │
│ scoring │ ←────────────┘
└─────────┘
│
┌─────────────┼───────────────┐
│ next round  │   game over   │
▼             ▼               ▼
┌─────────┐   ┌─────────┐    ┌───────┐
│ betting │   │ scoring │    │ ended │
└─────────┘   └─────────┘    └───────┘
```
For games without betting (generic tracker):
lobby → playing → scoring → playing → ... → ended

## Reconnection Logic

1. On page load, check localStorage for stored room code
2. If found, call `checkReconnection()` to verify room/player still exist
3. If valid, show "Rejoin Room?" banner
4. On rejoin, navigate to `/room/{code}` — existing player row is reused
5. Presence tracks the reconnection automatically

## Storage Cleanup

- **DB Trigger**: When last player is deleted from a room, room auto-deletes (CASCADE)
- **pg_cron** (manual setup): Every 30min, delete rooms with `last_activity` > 2 hours ago
- **Client**: On explicit leave, delete player row → may trigger room cleanup

## How to Extend the Engine

If you need to add platform-level functionality:
1. Add the function to the appropriate file (room.ts, realtime.ts, etc.)
2. Add full JSDoc comment
3. Export from the file
4. Update this README

Never add game-specific logic here. If a function needs to know about
specific game rules, it belongs in `/games/{slug}/logic.ts` instead.