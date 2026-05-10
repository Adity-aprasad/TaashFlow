'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PlayerRow, RoomRow } from '@/lib/engine/types'

const CHART_COLORS = [
  '#C9A84C', '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E9', '#F1948A',
]

interface ScoreLineChartProps {
  data: Array<Record<string, unknown>>
  players: PlayerRow[]
  room: RoomRow
}

/**
 * Line chart showing cumulative scores over rounds.
 * One line per player. Optional reference lines for thresholds.
 */
export function ScoreLineChart({ data, players, room }: ScoreLineChartProps) {
  const optionalRules = room.game_settings.optional_rules as Record<string, { enabled: boolean; value?: number }> | undefined
  const winThreshold = optionalRules?.winning_threshold?.enabled ? optionalRules.winning_threshold.value : null
  const elimThreshold = optionalRules?.elimination_score?.enabled ? optionalRules.elimination_score.value : null

  // For generic game, check target_score
  const targetScore = (room.game_settings.target_score as { enabled: boolean; value: number })?.enabled
    ? (room.game_settings.target_score as { enabled: boolean; value: number }).value
    : null

  if (data.length === 0) return null

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
        Score Progression
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="round"
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={12}
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
          {players.map((player, i) => (
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.display_name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
          {winThreshold && (
            <ReferenceLine
              y={winThreshold}
              stroke="var(--color-gold)"
              strokeDasharray="5 5"
              label={{ value: 'Win', position: 'right', fill: 'var(--color-gold)', fontSize: 10 }}
            />
          )}
          {elimThreshold && (
            <ReferenceLine
              y={elimThreshold}
              stroke="var(--color-red)"
              strokeDasharray="5 5"
              label={{ value: 'Elim', position: 'right', fill: 'var(--color-red)', fontSize: 10 }}
            />
          )}
          {targetScore && (
            <ReferenceLine
              y={targetScore}
              stroke="var(--color-gold)"
              strokeDasharray="5 5"
              label={{ value: 'Target', position: 'right', fill: 'var(--color-gold)', fontSize: 10 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}