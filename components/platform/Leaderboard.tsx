'use client'

import { motion } from 'framer-motion'
import { Crown, AlertTriangle } from 'lucide-react'
import type { ScoreRow, PlayerRow, RoomRow } from '@/lib/engine/types'
import { formatScore } from '@/lib/utils'

interface LeaderboardProps {
  scores: ScoreRow[]
  players: PlayerRow[]
  room: RoomRow
}

/**
 * Leaderboard component showing ranked players with scores.
 * Highlights leader, warns near-elimination players.
 */
export function Leaderboard({ scores, players, room }: LeaderboardProps) {
  const optionalRules = room.game_settings.optional_rules as Record<string, { enabled: boolean; value?: number }> | undefined
  const winThreshold = optionalRules?.winning_threshold?.enabled ? optionalRules.winning_threshold.value : null
  const elimThreshold = optionalRules?.elimination_score?.enabled ? optionalRules.elimination_score.value : null

  // Sort by score descending
  const sorted = [...scores]
    .sort((a, b) => b.cumulative_score - a.cumulative_score)
    .map((score, index) => {
      const player = players.find((p) => p.id === score.player_id)
      return { score, player, rank: index + 1 }
    })
    .filter((entry) => entry.player)

  if (sorted.length === 0) {
    return (
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
          Leaderboard
        </h3>
        <p className="text-sm text-[var(--color-muted)]">Scores will appear after the first round</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
        Leaderboard
      </h3>
      <div className="space-y-2">
        {sorted.map((entry, i) => {
          const nearWin = winThreshold && entry.score.cumulative_score >= winThreshold * 0.9
          const nearElim = elimThreshold && entry.score.cumulative_score <= elimThreshold + 20

          return (
            <motion.div
              key={entry.score.player_id}
              layout
              className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] ${
                entry.player?.is_eliminated
                  ? 'opacity-50 bg-[var(--color-surface)]'
                  : nearWin
                  ? 'bg-[var(--color-winner-glow)] border border-[var(--color-gold-dim)]'
                  : nearElim
                  ? 'bg-[var(--color-elim-glow)] border border-[var(--color-red)]/30'
                  : 'bg-[var(--color-surface)]'
              }`}
            >
              <span className="text-sm font-bold text-[var(--color-muted)] w-6">
                {entry.rank}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: entry.player?.avatar_color }}
              >
                {entry.player?.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">{entry.player?.display_name}</span>
                  {i === 0 && <Crown size={12} className="text-[var(--color-gold)] shrink-0" />}
                  {nearElim && <AlertTriangle size={12} className="text-[var(--color-red)] shrink-0" />}
                </div>
                {entry.player?.is_eliminated && (
                  <span className="text-xs text-[var(--color-red)]">Eliminated</span>
                )}
              </div>
              <span className="font-bold text-[var(--color-gold)] font-mono">
                {entry.score.cumulative_score}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Threshold lines */}
      {(winThreshold || elimThreshold) && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-4 text-xs text-[var(--color-muted)]">
          {winThreshold && <span>🏆 Win: {winThreshold}</span>}
          {elimThreshold && <span>💀 Elim: {elimThreshold}</span>}
        </div>
      )}
    </div>
  )
}