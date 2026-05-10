import type { ComponentType } from 'react'
import type { ZodType } from 'zod'

/**
 * Defines an optional rule that can be toggled on/off at room creation.
 */
export interface OptionalRule {
  key: string
  label: string
  description: string
  default: boolean
  valueSchema?: ZodType
  defaultValue?: unknown
  valueLabel?: string
}

/**
 * Defines a game phase and what component to render during it.
 */
export interface GamePhase {
  key: string
  label: string
  showDashboard: boolean
}

/**
 * Props passed to all game phase components by the platform shell.
 */
export interface GamePhaseProps {
  room: RoomRow
  players: PlayerRow[]
  currentPlayer: PlayerRow | null
}

/**
 * The complete configuration for a game module.
 */
export interface GameConfig {
  slug: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  icon: string
  settingsSchema: ZodType
  defaultSettings: Record<string, unknown>
  optionalRules: OptionalRule[]
  phases: GamePhase[]
  components: {
    RoomSettings: ComponentType<RoomSettingsProps>
    BettingPhase?: ComponentType<GamePhaseProps>
    PlayPhase?: ComponentType<GamePhaseProps>
    ScoreEntry: ComponentType<GamePhaseProps>
    GameEndScreen: ComponentType<GamePhaseProps>
  }
}

/**
 * Props for game-specific room settings components.
 */
export interface RoomSettingsProps {
  settings: Record<string, unknown>
  onChange: (settings: Record<string, unknown>) => void
}

// ══════════════════════════════════════════════════
//  DATABASE ROW TYPES
// ══════════════════════════════════════════════════

export interface RoomRow {
  id: string
  code: string
  owner_id: string
  game_slug: string
  max_players: number
  permission_mode: 'owner' | 'player'
  status: 'lobby' | 'betting' | 'playing' | 'scoring' | 'ended'
  current_round: number
  game_settings: Record<string, unknown>
  last_activity: string
  created_at: string
}

export interface PlayerRow {
  id: string
  room_id: string
  auth_id: string
  display_name: string
  avatar_color: string
  is_ready: boolean
  is_eliminated: boolean
  is_spectator: boolean
  is_owner: boolean
  joined_at: string
}

export interface RoundRow {
  id: string
  room_id: string
  round_number: number
  round_meta: Record<string, unknown>
  created_at: string
}

export interface BetRow {
  id: string
  round_id: string
  player_id: string
  bet_amount: number | null
  actual_hands: number | null
  round_points: number | null
  bet_meta: Record<string, unknown>
  submitted_at: string | null
}

export interface ScoreRow {
  id: string
  player_id: string
  room_id: string
  cumulative_score: number
  last_updated: string
}

// ══════════════════════════════════════════════════
//  REALTIME EVENT TYPES
// ══════════════════════════════════════════════════

export interface BroadcastEvents {
  'phase:start_betting': { round: number; betting_started_at: string }
  'bet:locked': { player_id: string }
  'phase:reveal_bets': { bets: Array<{ player_id: string; amount: number }> }
  'phase:start_play': { round: number; cards_per_player: number }
  'phase:start_scoring': { round: number }
  'phase:scores_confirmed': {
    scores: Array<{ player_id: string; round_pts: number; total: number }>
  }
  'game:ended': {
    winner_id: string | null
    final_scores: Array<{ player_id: string; total: number }>
  }
  'player:eliminated': { player_id: string }
  'owner:transferred': { new_owner_id: string }
}

export type BroadcastEventName = keyof BroadcastEvents