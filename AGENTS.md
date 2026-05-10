# Takht Platform — AI Agent Context

## What This Is

A multiplayer card game platform deployed on Vercel (free tier) with Supabase (free tier) as the backend. No player accounts — fully anonymous auth. Currently hosts:

1. **Takht** — A trick-taking card game with betting, scoring, and optional rules
2. **Generic Score Tracker** — Manual score entry for any physical game

Built to be extended with new games without touching platform code.

## Architecture (ASCII Diagram)
```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3 — PLATFORM SHELL                      │
│  /app/           Routes, pages, layout                          │
│  /components/    Platform UI (Lobby, Dashboard, Charts, etc.)   │
│  Rule: Renders game components via registry. Never hardcodes.   │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 2 — GAME MODULES                        │
│  /games/takht/       Takht card game                            │
│  /games/generic/     Generic score tracker                      │
│  /games/registry.ts  THE SINGLE EXTENSION POINT                 │
│  Rule: Imports from /lib/engine/. Never from other games.       │
├─────────────────────────────────────────────────────────────────┤
│                    LAYER 1 — PLATFORM ENGINE                     │
│  /lib/engine/    Room lifecycle, realtime, auth, cleanup        │
│  /lib/supabase/  Client/server Supabase instances               │
│  /lib/utils.ts   Shared utilities                               │
│  Rule: ZERO game-specific logic.                                │
└─────────────────────────────────────────────────────────────────┘
```
## The Golden Rule

**Adding a new game = add `/games/{slug}/` folder + one line in `registry.ts`. No other files change.**

## Key Files Map

| File | Purpose |
|------|---------|
| `/games/registry.ts` | Single registry of all games. Only file touched when adding a game. |
| `/lib/engine/types.ts` | All TypeScript interfaces: GameConfig, GamePhase, OptionalRule, DB types |
| `/lib/engine/room.ts` | Room CRUD: create, join, leave, kick, transfer ownership |
| `/lib/engine/realtime.ts` | Supabase Realtime channel setup, broadcast helpers, presence |
| `/lib/engine/session.ts` | Anonymous auth, session persistence, reconnection detection |
| `/lib/engine/cleanup.ts` | Client-side cleanup triggers |
| `/components/platform/RoomPhaseRouter.tsx` | Reads room phase + game slug → renders correct game component |
| `/components/platform/Dashboard.tsx` | Game-agnostic dashboard shell with charts and leaderboard |
| `/app/room/[code]/page.tsx` | Dynamic room page — fetches room, bootstraps realtime |
| `/games/takht/logic.ts` | Takht scoring formula implementation |
| `/games/takht/config.ts` | Takht metadata, settings schema, component references |

## How to Add a New Game

1. Create `/games/{new-slug}/` directory
2. Create `config.ts` — export a `GameConfig` object:
   - slug, name, description, min/maxPlayers, icon
   - settingsSchema (Zod), defaultSettings
   - optionalRules array
   - phases array
   - components object (React components for each phase)
3. Create `logic.ts` — implement scoring/validation functions
4. Create `phases.ts` — define phase list and transitions
5. Create `components/` — game-specific UI for each phase
6. Create `README.md` — document rules for future AI/devs
7. Add ONE line to `/games/registry.ts`:
   ```ts
   import { myGame } from './my-slug/config'
   // then add to GAME_REGISTRY: { ..., 'my-slug': myGame }
8. Done. Platform picks it up automatically.

## How to Add a New Optional Rule to Takht

1. Open /games/takht/config.ts
2. Add to the optionalRules array:
```ts 
{ key: 'myRule', label: 'My Rule', description: '...', default: false, valueSchema: z.boolean() }
```
3. Add the key to settingsSchema.shape.optional_rules
4. Handle in /games/takht/logic.ts scoring function
5. If UI needed, update relevant component in /games/takht/components/

## How to Add a New Chart to the Dashboard

1. Create component in /components/platform/MyChart.tsx
2. Import and add to /components/platform/Dashboard.tsx grid
3. Pass existing score/round data as props (available from Dashboard context)
4. Wrap chart content in <ResponsiveContainer>

| Table | Purpose |
|---|---|
| `rooms` | Active game rooms. `game_settings` JSONB stores game-specific configuration. |
| `players` | Players in rooms. Links `auth_id` to room. Tracks `ready`, `eliminated`, and `spectator` status. |
| `rounds` | Round records. `round_meta` JSONB stores game-specific round data. |
| `bets` | Per-player, per-round data. `bet_meta` JSONB stores game-specific extras. |
| `scores` | Cumulative score per player per room. Updated after each round. |

## Realtime Event Reference
Channel: room:{room_code}
| Event | Payload | Direction |
|-------|---------|-----------|
| `phase:start_betting` | `{ round, betting_started_at }` | Owner → All |
| `bet:locked` | `{ player_id }` | Player → All |
| `phase:reveal_bets` | `{ bets: [{ player_id, amount }] }` | Owner → All |
| `phase:start_play` | `{ round, cards_per_player }` | Owner → All |
| `phase:start_scoring` | `{ round }` | Owner → All |
| `phase:scores_confirmed` | `{ scores: [{ player_id, round_pts, total }] }` | Owner → All |
| `game:ended` | `{ winner_id, final_scores }` | Owner → All |
| `player:eliminated` | `{ player_id }` | Owner → All |
| `owner:transferred` | `{ new_owner_id }` | System → All |

## Stage Tracker

| Stage | Feature | Status |
|-------|---------|--------|
| 1 | Platform shell + Takht + Generic Tracker | ✅ Built |
| 2 | AI round commentary (Claude API) | Planned |
| 3 | Sound effects + haptic feedback | Planned |
| 4 | Spectator mode (public share link) | Planned |
| 5 | Game history export (PDF/CSV) | Planned |
| 6 | New game: Teen Patti / Rummy / custom | Planned |

## Constraints & Gotchas
- Supabase free tier: 500MB DB, 2GB bandwidth, 50MB file storage, 500 concurrent realtime connections
- Tailwind v4: NO tailwind.config.js. All config in CSS via @theme {} in globals.css
- Next.js 16: Uses proxy.ts not middleware.ts. Supports "use cache" directive. No experimental.ppr.
- Timer sync: Always derive countdown from server betting_started_at timestamp, never client clock
- Player count affects cards: cards_per_player = floor(52 / player_count)
- Sum validation: Total actual_hands must equal cards_per_player before score submission
- Anonymous auth: Must enable in Supabase dashboard under Authentication → Providers → Anonymous
- CASCADE deletes: All FKs cascade from rooms — deleting a room cleans everything
- No persistent data: Rooms auto-delete when empty or stale (2hr inactive)