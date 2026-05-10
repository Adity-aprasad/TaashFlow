'use client'

import { motion } from 'framer-motion'
import type { PlayerRow, ScoreRow } from '@/lib/engine/types'
import { formatScore } from '@/lib/utils'

interface PlayerCardProps {
  player: PlayerRow
  score: ScoreRow | undefined
  lastRoundPoints: number | null
}

/**
 * Individual player card showing avatar, name, total score, and round delta.
 */
export function PlayerCard({ player, score, lastRoundPoints }: PlayerCardProps) {
  return (
    <motion.div
      layout
      className={`p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] ${
        player.is_eliminated ? 'opacity-50' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: player.avatar_color }}
        >
          {player.display_name.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-sm font-medium truncate max-w-full">{player.display_name}</p>
        <p className="text-2xl font-bold text-[var(--color-gold)]">
          {score?.cumulative_score ?? 0}
        </p>
        {lastRoundPoints !== null && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-mono ${
              lastRoundPoints >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
            }`}
          >
            {lastRoundPoints > 0 ? '↑' : '↓'} {formatScore(lastRoundPoints)}
          </motion.p>
        )}
        {player.is_eliminated && (
          <span className="text-xs text-[var(--color-red)] bg-[var(--color-red)]/10 px-2 py-0.5 rounded-full">
            Eliminated
          </span>
        )}
      </div>
    </motion.div>
  )
}