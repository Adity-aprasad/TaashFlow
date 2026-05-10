'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PlayerRow, BetRow } from '@/lib/engine/types'

interface RoundBarChartProps {
  roundData: { round: number; bets: BetRow[] }
  players: PlayerRow[]
}

/**
 * Bar chart for the latest round.
 * Shows bet vs actual vs points for each player.
 */
export function RoundBarChart({ roundData, players }: RoundBarChartProps) {
  const chartData = roundData.bets.map((bet) => {
    const player = players.find((p) => p.id === bet.player_id)
    return {
      name: player?.display_name || 'Unknown',
      bet: bet.bet_amount || 0,
      actual: bet.actual_hands || 0,
      points: bet.round_points || 0,
    }
  })

  if (chartData.length === 0) return null

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
        Round {roundData.round} Summary
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="name"
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
            }}
          />
          <Bar dataKey="bet" name="Bet" fill="var(--color-gold-dim)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill="var(--color-gold)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="points" name="Points" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.points >= 0 ? 'var(--color-green)' : 'var(--color-red)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}