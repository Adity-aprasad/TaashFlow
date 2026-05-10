import { z } from 'zod'
import type { GameConfig, OptionalRule } from '@/lib/engine/types'
import { genericPhases } from './phases'
import { GenericSettings } from './components/GenericSettings'
import { ScoreEntry } from './components/ScoreEntry'
import { GameEndScreen } from './components/GameEndScreen'

const optionalRules: OptionalRule[] = [
  {
    key: 'target_score',
    label: 'Target Score',
    description: 'Reference line shown on the chart (cosmetic)',
    default: false,
    valueSchema: z.number().int().min(1).max(10000),
    defaultValue: 100,
    valueLabel: 'Target',
  },
]

const settingsSchema = z.object({
  target_score: z.object({
    enabled: z.boolean().default(false),
    value: z.number().int().min(1).max(10000).default(100),
  }).default({ enabled: false, value: 100 }),
})

const defaultSettings: Record<string, unknown> = {
  target_score: { enabled: false, value: 100 },
}

export const genericGame: GameConfig = {
  slug: 'generic',
  name: 'Score Tracker',
  description: 'Manual score entry for any game',
  minPlayers: 2,
  maxPlayers: 12,
  icon: '📊',
  settingsSchema,
  defaultSettings,
  optionalRules,
  phases: genericPhases,
  components: {
    RoomSettings: GenericSettings,
    ScoreEntry: ScoreEntry,
    GameEndScreen: GameEndScreen,
  },
}