'use client'

import { useState, useEffect } from 'react'
import type { GamePhaseProps, BetRow } from '@/lib/engine/types'
import { createBrowserClient } from '@/lib/supabase/client'
import { getCardsPerPlayer } from '@/lib/utils'

/**
 * Play phase component for Takht.
 * Shows current round info, player bets, optional trick counter,
 * and "Enter Scores" button when round ends.
 */
export function PlayPhase({ room, players, currentPlayer }: GamePhaseProps) {
  const [bets, setBets] = useState<BetRow[]>([])
  const [trickCounts, setTrickCounts] = useState<Record<string, number>>({})

  const activePlayers = players.filter((p) => !p.is_spectator && !p.is_eliminated)
  const cardsPerPlayer = getCardsPerPlayer(activePlayers.length)
  const isOwner = currentPlayer?.is_owner || false
  const canEnterScores = room.permission_mode === 'player' || isOwner

  useEffect(() => {
    async function fetchBets() {
      const supabase = createBrowserClient()
      const { data: roundData } = await supabase
        .from('rounds')
        .select('id')
        .eq('room_id', room.id)
        .eq('round_number', room.current_round)
        .single()

      if (roundData) {
        const { data: betsData } = await supabase
          .from('bets')
          .select('*')
          .eq('round_id', roundData.id)

        if (betsData) {
          setBets(betsData as BetRow[])
        }
      }
    }
    fetchBets()
  }, [room.id, room.current_round])

  async function handleEnterScores() {
    const supabase = createBrowserClient()
    await supabase
      .from('rooms')
      .update({ status: 'scoring', last_activity: new Date().toISOString() })
      .eq('id', room.id)
  }

  function updateTrickCount(playerId: string, delta: number) {
    setTrickCounts((prev) => ({
      ...prev,
      [playerId]: Math.max(0, Math.min(cardsPerPlayer, (prev[playerId] || 0) + delta)),
    }))
  }

  const optionalRules = room.game_settings.optional_rules as Record<string, { enabled: boolean; value?: number }> | undefined
  const roundLimit = optionalRules?.round_limit

  return (
    <div className="p-6 space-y-6">
      {/* Round Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Round {room.current_round} in Progress
        </h2>
        {roundLimit?.enabled && (
          <p className="text-sm text-[var(--color-muted)]">
            Round {room.current_round} of {roundLimit.value}
          </p>
        )}
        <p className="text-sm text-[var(--color-muted)]">
          {cardsPerPlayer} hands to play • Trump: ♠️ Spades
        </p>
      </div>

      {/* Player Bets & Trick Counter */}
      <div className="space-y-3 max-w-lg mx-auto">
        {activePlayers.map((player) => {
          const playerBet = bets.find((b) => b.player_id === player.id)
          const tricks = trickCounts[player.id] || 0

          return (
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{player.display_name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  Bet: <span className="text-[var(--color-gold)]">{playerBet?.bet_amount ?? '?'}</span>
                </p>
              </div>
              {/* Trick counter (cosmetic) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateTrickCount(player.id, -1)}
                  className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm hover:border-[var(--color-gold)] transition-colors"
                  aria-label={`Decrease trick count for ${player.display_name}`}
                >
                  −
                </button>
                <span className="w-6 text-center font-mono text-sm">{tricks}</span>
                <button
                  onClick={() => updateTrickCount(player.id, 1)}
                  className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm hover:border-[var(--color-gold)] transition-colors"
                  aria-label={`Increase trick count for ${player.display_name}`}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-[var(--color-muted)]">
        Trick counter is cosmetic only — use actual scores at round end
      </p>

      {/* Enter Scores Button */}
      {canEnterScores && (
        <div className="flex justify-center">
          <button
            onClick={handleEnterScores}
            className="px-8 py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Enter Scores
          </button>
        </div>
      )}
    </div>
  )
}