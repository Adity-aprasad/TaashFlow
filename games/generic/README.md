# Generic Score Tracker

## Purpose

A simple, game-agnostic score tracker for any physical game. Players manually
enter scores each round. No betting, no validation rules (any integer accepted).

## How It Works

1. Create room → set max players, permission mode, optional target score
2. Players join lobby → ready up → game starts
3. Each round: owner (or each player) enters a score for that round
4. Scores are cumulative. Chart and leaderboard update in real-time.
5. Game ends when owner clicks "End Game"

## Settings

- **Max Players**: 2–12 (default 6)
- **Permission Mode**: Owner Controls All / Each Player Manages Own
- **Target Score** (optional): Reference line on chart (cosmetic only)

## Extension Notes

To add game-specific rules to Generic Tracker:
1. Add optional rules to `config.ts`
2. Implement validation in `logic.ts`
3. Update `ScoreEntry` component if UI changes needed

This game is intentionally minimal — it's the baseline for "add any game
without building scoring logic."