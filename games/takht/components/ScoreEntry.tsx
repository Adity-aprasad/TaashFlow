'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { GamePhaseProps, BetRow } from '@/lib/engine/types'
import { createBrowserClient } from '@/lib/supabase/client'
import { getCardsPerPlayer, formatScore } from '@/lib/utils'
import {
  calculateRoundPoints,
  validateHandsSum,
  checkWinningThreshold,
  checkElimination,
  isFinalRound,
} from '../logic'

export function ScoreEntry({ room, players, currentPlayer }: GamePhaseProps) {
  const [actualHands, setActualHands]   = useState<Record<string, number>>({})
  const [bets, setBets]                 = useState<BetRow[]>([])
  const [showConfirm, setShowConfirm]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [initialized, setInitialized]   = useState(false)

  const activePlayers = useMemo(
    () => players.filter((p) => !p.is_spectator && !p.is_eliminated),
    [players]
  )

  const cardsPerPlayer = getCardsPerPlayer(activePlayers.length)
  const isOwner        = currentPlayer?.is_owner ?? false
  const canSubmit      = room.permission_mode === 'owner' ? isOwner : true
  const zeroBetValue   = (room.game_settings.zero_bet_value as number) ?? 150

  // ── Shorthand helpers to read optional rules ──────────────────────────────
  const optionalRules = room.game_settings.optional_rules as
    | Record<string, { enabled: boolean; value?: number }>
    | undefined

  const roundLimitRule  = optionalRules?.round_limit
  const winThreshRule   = optionalRules?.winning_threshold
  const elimScoreRule   = optionalRules?.elimination_score

  // ── Initialize hand inputs to 0 for every active player ──────────────────
  useEffect(() => {
    if (!initialized && activePlayers.length > 0) {
      const initial: Record<string, number> = {}
      activePlayers.forEach((p) => { initial[p.id] = 0 })
      setActualHands(initial)
      setInitialized(true)
    }
  }, [activePlayers, initialized])

  // ── Fetch bets for the current round ─────────────────────────────────────
  useEffect(() => {
    async function fetchBets() {
      const supabase = createBrowserClient()

      // FIX: use maybeSingle() so 0 rows returns null instead of PGRST116
      const { data: roundData } = await supabase
        .from('rounds')
        .select('id')
        .eq('room_id', room.id)
        .eq('round_number', room.current_round)
        .maybeSingle()

      if (!roundData) return

      const { data: betsData } = await supabase
        .from('bets')
        .select('*')
        .eq('round_id', roundData.id)

      if (betsData) setBets(betsData as BetRow[])
    }

    fetchBets()
  }, [room.id, room.current_round])

  // ── Derived totals ────────────────────────────────────────────────────────
  const currentSum = useMemo(
    () => Object.values(actualHands).reduce((acc, v) => acc + v, 0),
    [actualHands]
  )

  const isValid = validateHandsSum(Object.values(actualHands), cardsPerPlayer)

  const pointsPreview = useMemo(() => {
    const preview: Record<string, number> = {}
    activePlayers.forEach((p) => {
      const bet    = bets.find((b) => b.player_id === p.id)?.bet_amount ?? 0
      const actual = actualHands[p.id] ?? 0
      preview[p.id] = calculateRoundPoints(bet, actual, zeroBetValue)
    })
    return preview
  }, [actualHands, bets, activePlayers, zeroBetValue])

  function updateHands(playerId: string, value: number) {
    setActualHands((prev) => ({
      ...prev,
      [playerId]: Math.max(0, Math.min(cardsPerPlayer, value)),
    }))
  }

  // ── Core submit logic ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isValid || submitting) return
    setSubmitting(true)

    const supabase = createBrowserClient()

    // FIX: use maybeSingle() — .single() throws PGRST116 on 0 rows
    const { data: roundData } = await supabase
      .from('rounds')
      .select('id')
      .eq('room_id', room.id)
      .eq('round_number', room.current_round)
      .maybeSingle()

    if (!roundData) {
      setSubmitting(false)
      return
    }

    // ── Step 1: update bets + cumulative scores, track new totals ────────
    const newCumulativeScores: Array<{ playerId: string; cumulativeScore: number }> = []

    for (const player of activePlayers) {
      const bet    = bets.find((b) => b.player_id === player.id)?.bet_amount ?? 0
      const actual = actualHands[player.id] ?? 0
      const points = calculateRoundPoints(bet, actual, zeroBetValue)

      // Write actual hands + calculated points back to the bet row
      await supabase
        .from('bets')
        .update({ actual_hands: actual, round_points: points })
        .eq('round_id', roundData.id)
        .eq('player_id', player.id)

      // Read current cumulative score
      const { data: scoreData } = await supabase
        .from('scores')
        .select('cumulative_score')
        .eq('player_id', player.id)
        .eq('room_id', room.id)
        .maybeSingle()                         // FIX: was .single()

      const newScore = (scoreData?.cumulative_score ?? 0) + points
      newCumulativeScores.push({ playerId: player.id, cumulativeScore: newScore })

      await supabase
        .from('scores')
        .upsert(
          {
            player_id:        player.id,
            room_id:          room.id,
            cumulative_score: newScore,
            last_updated:     new Date().toISOString(),
          },
          { onConflict: 'player_id,room_id' }
        )
    }

    // ── Step 2: apply elimination if rule is enabled ──────────────────────
    if (elimScoreRule?.enabled && elimScoreRule.value != null) {
      const toEliminate = checkElimination(newCumulativeScores, elimScoreRule.value)
      for (const playerId of toEliminate) {
        await supabase
          .from('players')
          .update({ is_eliminated: true })
          .eq('id', playerId)
      }
    }

    // ── Step 3: determine whether the game is over ────────────────────────
    let gameOver = false

    // 3a. Round limit reached
    if (
      roundLimitRule?.enabled &&
      isFinalRound(room.current_round, roundLimitRule.value ?? 10)
    ) {
      gameOver = true
    }

    // 3b. Winning threshold crossed
    if (!gameOver && winThreshRule?.enabled && winThreshRule.value != null) {
      const winners = checkWinningThreshold(newCumulativeScores, winThreshRule.value)
      if (winners.length > 0) gameOver = true
    }

    // 3c. Only one (or zero) players remain after eliminations
    if (!gameOver && elimScoreRule?.enabled && elimScoreRule.value != null) {
      const surviving = newCumulativeScores.filter(
        (s) => s.cumulativeScore > (elimScoreRule.value ?? -Infinity)
      )
      if (surviving.length <= 1) gameOver = true
    }

    // ── Step 4a: game over → set status to ended ──────────────────────────
    if (gameOver) {
      await supabase
        .from('rooms')
        .update({ status: 'ended', last_activity: new Date().toISOString() })
        .eq('id', room.id)

      setSubmitting(false)
      setShowConfirm(false)
      return
    }

    // ── Step 4b: game continues → create next round record FIRST ─────────
    //
    // FIX (PGRST116): BettingPhase does .maybeSingle() on the round record
    // for room.current_round. If we bump current_round without inserting
    // that row first, BettingPhase finds 0 rows and crashes.
    //
    // FIX (wrong status): was 'playing' — must be 'betting' so the next
    // round starts with the betting phase, not the play phase.
    //
    const nextRound          = room.current_round + 1
    const survivingPlayers   = activePlayers.filter((p) => {
      const score = newCumulativeScores.find((s) => s.playerId === p.id)
      return (score?.cumulativeScore ?? 0) > (elimScoreRule?.value ?? -Infinity)
    })
    const nextCardsPerPlayer = getCardsPerPlayer(
      survivingPlayers.length > 0 ? survivingPlayers.length : activePlayers.length
    )

    // Insert next round row so BettingPhase can find it immediately
    await supabase.from('rounds').insert({
      room_id:      room.id,
      round_number: nextRound,
      round_meta:   {
        cards_per_player:    nextCardsPerPlayer,
        betting_started_at:  new Date().toISOString(),  // syncs all client timers
      },
    })

    // Now update the room — realtime will push this to all clients
    await supabase
      .from('rooms')
      .update({
        status:        'betting',   // FIX: was 'playing'
        current_round: nextRound,
        last_activity: new Date().toISOString(),
      })
      .eq('id', room.id)

    setSubmitting(false)
    setShowConfirm(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <h2
        className="text-2xl font-bold text-center"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Enter Scores — Round {room.current_round}
      </h2>

      {/* Round context */}
      {roundLimitRule?.enabled && (
        <p className="text-center text-sm text-[var(--color-muted)]">
          Round {room.current_round} of {roundLimitRule.value}
          {isFinalRound(room.current_round, roundLimitRule.value ?? 10) && (
            <span className="ml-2 text-[var(--color-gold)] font-semibold">— Final Round!</span>
          )}
        </p>
      )}

      {/* Sum validation banner */}
      <div
        className={`text-center p-3 rounded-[var(--radius-md)] ${
          isValid
            ? 'bg-[var(--color-green)]/20 border border-[var(--color-green)]'
            : 'bg-[var(--color-red)]/20 border border-[var(--color-red)]'
        }`}
      >
        <p className="text-sm font-medium">
          Total hands: {currentSum} / {cardsPerPlayer}
          {isValid ? ' ✓' : ` (need exactly ${cardsPerPlayer})`}
        </p>
      </div>

      {/* Per-player hand input */}
      <div className="space-y-3">
        {activePlayers.map((player) => {
          const bet     = bets.find((b) => b.player_id === player.id)?.bet_amount ?? 0
          const actual  = actualHands[player.id] ?? 0
          const preview = pointsPreview[player.id] ?? 0

          return (
            <div
              key={player.id}
              className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: player.avatar_color }}
                >
                  {player.display_name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{player.display_name}</p>
                  <p className="text-xs text-[var(--color-muted)]">Bet: {bet}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateHands(player.id, actual - 1)}
                    disabled={actual <= 0 || !canSubmit}
                    className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-lg font-bold hover:border-[var(--color-gold)] transition-colors disabled:opacity-30"
                    aria-label={`Decrease hands for ${player.display_name}`}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-lg font-bold">{actual}</span>
                  <button
                    onClick={() => updateHands(player.id, actual + 1)}
                    disabled={actual >= cardsPerPlayer || !canSubmit}
                    className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-lg font-bold hover:border-[var(--color-gold)] transition-colors disabled:opacity-30"
                    aria-label={`Increase hands for ${player.display_name}`}
                  >
                    +
                  </button>
                </div>

                <div
                  className={`w-16 text-right font-mono text-sm font-bold ${
                    preview >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                  }`}
                >
                  {formatScore(preview)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {canSubmit && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!isValid}
          className="w-full py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Confirm Scores
        </button>
      )}

      {!canSubmit && (
        <p className="text-center text-sm text-[var(--color-muted)] italic">
          Waiting for the host to enter scores…
        </p>
      )}

      {/* Confirmation modal */}
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
            <h3 className="text-lg font-bold text-center">
              Confirm Round {room.current_round}
            </h3>

            {/* Score summary */}
            <div className="space-y-2">
              {activePlayers.map((player) => {
                const bet     = bets.find((b) => b.player_id === player.id)?.bet_amount ?? 0
                const actual  = actualHands[player.id] ?? 0
                const preview = pointsPreview[player.id] ?? 0
                return (
                  <div key={player.id} className="flex justify-between text-sm">
                    <span>{player.display_name}</span>
                    <span>
                      Bet {bet} → Got {actual} ={' '}
                      <span
                        className={
                          preview >= 0
                            ? 'text-[var(--color-green)]'
                            : 'text-[var(--color-red)]'
                        }
                      >
                        {formatScore(preview)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Win-condition warnings */}
            {winThreshRule?.enabled && (
              <p className="text-xs text-center text-[var(--color-muted)]">
                🏆 Win threshold: {winThreshRule.value} pts
              </p>
            )}
            {elimScoreRule?.enabled && (
              <p className="text-xs text-center text-[var(--color-muted)]">
                💀 Elimination floor: {elimScoreRule.value} pts
              </p>
            )}

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
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}