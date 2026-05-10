'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { GamePhaseProps, ScoreRow } from '@/lib/engine/types'
import { createBrowserClient } from '@/lib/supabase/client'
import { determineWinners } from '../logic'

/**
 * Game end screen for Generic Score Tracker.
 * Shows winner with confetti and final standings.
 */
export function GameEndScreen({ room, players, currentPlayer }: GamePhaseProps) {
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [winners, setWinners] = useState<string[]>([])

  useEffect(() => {
    async function fetchScores() {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('scores')
        .select('*')
        .eq('room_id', room.id)
        .order('cumulative_score', { ascending: false })

      if (data) {
        setScores(data as ScoreRow[])
        const winnerIds = determineWinners(
          data.map((s: ScoreRow) => ({ playerId: s.player_id, cumulativeScore: s.cumulative_score }))
        )
        setWinners(winnerIds)
      }
    }
    fetchScores()
  }, [room.id])

  useEffect(() => {
    if (winners.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A84C', '#2D6A4F', '#E6EDF3'],
      })
    }
  }, [winners])

  const sortedPlayers = scores.map((s) => {
    const player = players.find((p) => p.id === s.player_id)
    return { ...s, player }
  }).filter((s) => s.player)

  async function handlePlayAgain() {
    const supabase = createBrowserClient()
    await supabase
      .from('rooms')
      .update({ status: 'lobby', current_round: 0, last_activity: new Date().toISOString() })
      .eq('id', room.id)

    await supabase
      .from('players')
      .update({ is_ready: false })
      .eq('room_id', room.id)

    await supabase.from('scores').delete().eq('room_id', room.id)
    await supabase.from('rounds').delete().eq('room_id', room.id)
  }

  return (
    <div className="p-6 space-y-8 max-w-lg mx-auto min-h-dvh flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="text-center space-y-3"
      >
        <p className="text-6xl">🏆</p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Game Over!
        </h1>
        <div className="flex justify-center gap-2 flex-wrap">
          {winners.map((wid) => {
            const player = players.find((p) => p.id === wid)
            return (
              <span
                key={wid}
                className="px-4 py-2 bg-[var(--color-gold)]/20 border border-[var(--color-gold)] rounded-full text-[var(--color-gold)] font-semibold"
              >
                {player?.display_name || 'Unknown'}
              </span>
            )
          })}
        </div>
      </motion.div>

      {/* Final Standings */}
      <div className="w-full space-y-2">
        {sortedPlayers.map((entry, i) => (
          <div
            key={entry.player_id}
            className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] ${
              winners.includes(entry.player_id)
                ? 'bg-[var(--color-winner-glow)] border border-[var(--color-gold-dim)]'
                : 'bg-[var(--color-surface-2)] border border-[var(--color-border)]'
            }`}
          >
            <span className="text-sm font-bold text-[var(--color-muted)] w-6">{i + 1}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: entry.player?.avatar_color }}
            >
              {entry.player?.display_name.slice(0, 2).toUpperCase()}
            </div>
            <span className="flex-1 font-medium">{entry.player?.display_name}</span>
            <span className="font-bold text-[var(--color-gold)]">{entry.cumulative_score}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 w-full">
        {currentPlayer?.is_owner && (
          <button
            onClick={handlePlayAgain}
            className="flex-1 py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        )}
        <button
          onClick={() => { window.location.href = '/' }}
          className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] font-semibold hover:border-[var(--color-gold)] transition-colors"
        >
          Home
        </button>
      </div>
    </div>
  )
}