# Takht — Trick-Taking Card Game

## Overview

Takht is a trick-taking card game where players bet on how many hands (tricks)
they will win each round, then play with physical cards. The app handles
betting, scoring, and leaderboards — not card play simulation.

## Rules

- **Deck**: Standard 52 cards, dealt equally. Remainder set aside.
- **Trump suit**: Spades (always fixed, no bidding for trump)
- **Card power**: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
- **Trumps** always beat non-trumps regardless of value.
- **Hands per round** = floor(52 / player_count)

## Scoring Formula

bet    = declared bet (integer ≥ 0)
actual = hands won (integer ≥ 0)

IF bet == 0:
actual == 0  →  round_points = +zero_bet_value (default 150)
actual > 0   →  round_points = -zero_bet_value

ELSE IF actual == bet:
round_points = bet × 10

ELSE IF actual > bet:
round_points = (bet × 10) + ((actual - bet) × 1)

ELSE IF actual < bet:
round_points = -(bet × 10)

cumulative_score += round_points

### Examples (zero_bet_value = 150):
- Bet 0, got 0 → +150
- Bet 0, got 2 → -150
- Bet 3, got 3 → +30
- Bet 3, got 5 → +32 (30 + 2 extra)
- Bet 4, got 2 → -40

## Phase Flow

```
┌─────────┐   timer/lock   ┌─────────┐   reveal    ┌─────────┐
│ BETTING │ ─────────────→  │  REVEAL │ ─────────→  │  PLAY   │
└─────────┘                 └─────────┘             └─────────┘
↑                                                   │
│                                              enter scores
│                    ┌─────────┐                    │
└────── next round ──│ RESULTS │←───────────────────┘
└─────────┘
│
check win/elim
│
┌─────────┐
│  ENDED  │ (if conditions met)
└─────────┘
```

## Optional Rules

1. **Winning Score Threshold**: Game ends when any player reaches X points.
   Multi-player cross in same round → highest wins. Tiebreaker: fewer rounds.
   Still tied → joint winners.

2. **Elimination Score**: Score ≤ floor → player eliminated (spectator).
   Last player standing wins automatically.

3. **Round Limit**: Game ends after N rounds. Top scorer wins.

4. **No-Zero Final Round**: If Round Limit is set, betting 0 is blocked
   in the last round. Input min = 1.

## Component Tree
- TakhtSettings.tsx    → Room creation settings panel
- BettingPhase.tsx     → Timer + bet input + lock button
- PlayPhase.tsx        → Round in progress (bets visible, trick counter)
- ScoreEntry.tsx       → Actual hands entry + validation + confirm
- GameEndScreen.tsx    → Winner announcement + confetti + final scores