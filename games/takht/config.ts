import { z } from 'zod'
import type { GameConfig, OptionalRule } from '@/lib/engine/types'
import { takhtPhases } from './phases'
import { TakhtSettings } from './components/TakhtSettings'
import { BettingPhase } from './components/BettingPhase'
import { PlayPhase } from './components/PlayPhase'
import { ScoreEntry } from './components/ScoreEntry'
import { GameEndScreen } from './components/GameEndScreen'

const optionalRules: OptionalRule[] = [
  {
    key: 'winning_threshold',
    label: 'Winning Score Threshold',
    description: 'Game ends when any player reaches this score',
    default: false,
    valueSchema: z.number().int().min(100).max(5000),
    defaultValue: 500,
    valueLabel: 'Target Score',
  },
  {
    key: 'elimination_score',
    label: 'Elimination Score',
    description: 'Players at or below this score are eliminated',
    default: false,
    valueSchema: z.number().int().min(-5000).max(-50),
    defaultValue: -500,
    valueLabel: 'Elimination Floor',
  },
  {
    key: 'round_limit',
    label: 'Round Limit',
    description: 'Game ends after this many rounds',
    default: false,
    valueSchema: z.number().int().min(3).max(50),
    defaultValue: 10,
    valueLabel: 'Max Rounds',
  },
  {
    key: 'no_zero_final',
    label: 'No-Zero Final Round',
    description: 'Betting 0 is blocked in the last round (requires Round Limit)',
    default: false,
  },
]

const settingsSchema = z.object({
  zero_bet_value: z.number().int().min(50).max(500).default(150),
  optional_rules: z.object({
    winning_threshold: z.object({
      enabled: z.boolean().default(false),
      value: z.number().int().min(100).max(5000).default(500),
    }).default({ enabled: false, value: 500 }),
    elimination_score: z.object({
      enabled: z.boolean().default(false),
      value: z.number().int().min(-5000).max(-50).default(-500),
    }).default({ enabled: false, value: -500 }),
    round_limit: z.object({
      enabled: z.boolean().default(false),
      value: z.number().int().min(3).max(50).default(10),
    }).default({ enabled: false, value: 10 }),
    no_zero_final: z.object({
      enabled: z.boolean().default(false),
    }).default({ enabled: false }),
  }).default({}),
})

const defaultSettings: Record<string, unknown> = {
  zero_bet_value: 150,
  optional_rules: {
    winning_threshold: { enabled: false, value: 500 },
    elimination_score: { enabled: false, value: -500 },
    round_limit: { enabled: false, value: 10 },
    no_zero_final: { enabled: false },
  },
}

export const takhtGame: GameConfig = {
  slug: 'takht',
  name: 'Takht',
  description: 'Trick-taking card game with betting and scoring',
  minPlayers: 3,
  maxPlayers: 9,
  icon: '♠️',
  settingsSchema,
  defaultSettings,
  optionalRules,
  phases: takhtPhases,
  components: {
    RoomSettings: TakhtSettings,
    BettingPhase: BettingPhase,
    PlayPhase: PlayPhase,
    ScoreEntry: ScoreEntry,
    GameEndScreen: GameEndScreen,
  },
}