import type { GamePhase } from '@/lib/engine/types'

export const takhtPhases: GamePhase[] = [
  { key: 'betting', label: 'Betting', showDashboard: true },
  { key: 'playing', label: 'Playing', showDashboard: true },
  { key: 'scoring', label: 'Score Entry', showDashboard: true },
  { key: 'ended', label: 'Game Over', showDashboard: false },
]