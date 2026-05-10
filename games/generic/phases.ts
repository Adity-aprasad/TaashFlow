import type { GamePhase } from '@/lib/engine/types'

/**
 * Phase definitions for Generic Score Tracker.
 * No betting phase — goes directly from playing to scoring.
 */
export const genericPhases: GamePhase[] = [
  {
    key: 'playing',
    label: 'Playing',
    showDashboard: true,
  },
  {
    key: 'scoring',
    label: 'Score Entry',
    showDashboard: true,
  },
  {
    key: 'ended',
    label: 'Game Over',
    showDashboard: false,
  },
]