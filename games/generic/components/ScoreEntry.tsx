'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { GamePhaseProps } from '@/lib/engine/types'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatScore } from '@/lib/utils'

/**
 * Score entry component for Generic Score Tracker.
 * Allows entering any integer per player. No sum validation.
 */
export function ScoreEntry({ room, players, currentPlayer }: GamePhaseProps) {
  const [roundScores, setRoundScores] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const activePlayers = players.filter((p) => !p.is_spectator)
  const isOwner = currentPlayer?.is_owner || false
  const canSubmit = room.permission_mode === 'owner' ? isOwner : true

  useEffect(() => {
    const initial: Record<string, number> = {}
    activePlayers.forEach((p) => { initial[p.id] = 0 })
    setRoundScores(initial)
  }, [])

  function updateScore(playerId: string, value: string) {
    const num = parseInt(value, 10)
    setRoundScores((prev) => ({
      ...prev,
      [playerId]: isNaN(num) ? 0 : num,
    }))
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    const supabase = createBrowserClient()

    // Create round record
    const { data: roundData } = await supabase
      .from('rounds')
      .insert({
        room_id: room.id,
        round_number: room.current_round,
        round_meta: {},
      })
      .select()
      .single()

    if (!roundData) {
      setSubmitting(false)
      return
    }

    // Create bets (score entries) and update cumulative scores
    for (const player of activePlayers) {
      const roundScore = roundScores[player.id] ?? 0

      await supabase
        .from('bets')
        .insert({
          round_id: roundData.id,
          player_id: player.id,
          bet_amount: 0,
          actual_hands: 0,
          round_points: roundScore,
          bet_meta: { manual_score: roundScore },
        })

      // Update cumulative score
      const { data: scoreData } = await supabase
        .from('scores')
        .select('cumulative_score')
        .eq('player_id', player.id)
        .eq('room_id', room.id)
        .single()

      const currentScore = scoreData?.cumulative_score || 0
      await supabase
        .from('scores')
        .upsert({
          player_id: player.id,
          room_id: room.id,
          cumulative_score: currentScore + roundScore,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'player_id,room_id' })
    }

    // Advance round
    await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_round: room.current_round + 1,
        last_activity: new Date().toISOString(),
      })
      .eq('id', room.id)

    setSubmitting(false)
    setShowConfirm(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center" style={{ fontFamily: 'var(--font-heading)' }}>
        Enter Scores — Round {room.current_round}
      </h2>

      <div className="space-y-3">
        {activePlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)]"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: player.avatar_color }}
            >
              {player.display_name.slice(0, 2).toUpperCase()}
            </div>
            <span className="flex-1 font-medium truncate">{player.display_name}</span>
            <input
              type="number"
              value={roundScores[player.id] ?? 0}
              onChange={(e) => updateScore(player.id, e.target.value)}
              disabled={!canSubmit}
              className="w-20 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text)] text-center font-mono disabled:opacity-50"
              aria-label={`Score for ${player.display_name}`}
            />
          </div>
        ))}
      </div>

      {canSubmit && (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          Submit Scores
        </button>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-6 max-w-sm w-full space-y-4"
          >
            <h3 className="text-lg font-bold text-center">Confirm Scores</h3>
            <div className="space-y-2">
              {activePlayers.map((player) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span>{player.display_name}</span>
                  <span className={`font-mono ${(roundScores[player.id] ?? 0) >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                    {formatScore(roundScores[player.id] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-muted)] hover:border-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}