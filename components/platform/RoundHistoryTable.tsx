'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PlayerRow, BetRow } from '@/lib/engine/types'
import { formatScore } from '@/lib/utils'

interface RoundHistoryTableProps {
  roundHistory: Array<{ round: number; bets: BetRow[] }>
  players: PlayerRow[]
}

/**
 * Collapsible round history table.
 * Rows = rounds, columns = each player's round points.
 */
export function RoundHistoryTable({ roundHistory, players }: RoundHistoryTableProps) {
  const [expanded, setExpanded] = useState(false)

  if (roundHistory.length === 0) return null

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide hover:text-[var(--color-text)] transition-colors"
        aria-label={expanded ? 'Collapse history' : 'Expand history'}
      >
        <span>Round History</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 pr-3 text-[var(--color-muted)]">Round</th>
                {players.map((p) => (
                  <th key={p.id} className="text-center py-2 px-2 text-[var(--color-muted)]">
                    {p.display_name.slice(0, 8)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roundHistory.map((rh) => (
                <tr key={rh.round} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 pr-3 font-mono text-[var(--color-muted)]">{rh.round}</td>
                  {players.map((player) => {
                    const bet = rh.bets.find((b) => b.player_id === player.id)
                    const points = bet?.round_points ?? 0
                    return (
                      <td
                        key={player.id}
                        className={`text-center py-2 px-2 font-mono ${
                          points > 0
                            ? 'text-[var(--color-green)]'
                            : points < 0
                            ? 'text-[var(--color-red)]'
                            : 'text-[var(--color-muted)]'
                        }`}
                      >
                        {formatScore(points)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}