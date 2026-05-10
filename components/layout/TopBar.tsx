'use client'

import { Crown, Wifi, WifiOff } from 'lucide-react'

interface TopBarProps {
  roomCode?: string
  gameRound?: number
  gameName?: string
  isOwner?: boolean
  isConnected?: boolean
}

/**
 * Top navigation bar shown during active games.
 * Displays room code, current round, connection status.
 */
export function TopBar({ roomCode, gameRound, gameName, isOwner, isConnected = true }: TopBarProps) {
  return (
    <div className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Takht
          </h1>
          {gameName && (
            <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2 py-1 rounded-full">
              {gameName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {gameRound !== undefined && gameRound > 0 && (
            <span className="text-xs text-[var(--color-muted)]">
              Round {gameRound}
            </span>
          )}
          {roomCode && (
            <span className="text-xs font-mono text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-1 rounded">
              {roomCode}
            </span>
          )}
          {isOwner && <Crown size={14} className="text-[var(--color-gold)]" />}
          {isConnected ? (
            <Wifi size={14} className="text-[var(--color-green)]" />
          ) : (
            <WifiOff size={14} className="text-[var(--color-red)]" />
          )}
        </div>
      </div>
    </div>
  )
}