'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { GAME_REGISTRY, getAllGames } from '@/games/registry'
import type { GameConfig } from '@/lib/engine/types'

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
  onCreateRoom: (gameSlug: string, maxPlayers: number, permissionMode: 'owner' | 'player', gameSettings: Record<string, unknown>) => void
  initialGame?: string
}

/**
 * Modal for creating a new room.
 * Dynamically renders game-specific settings from the registry.
 */
export function CreateRoomModal({ open, onClose, onCreateRoom, initialGame }: CreateRoomModalProps) {
  const games = getAllGames()
  const [selectedSlug, setSelectedSlug] = useState(initialGame || 'takht')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [permissionMode, setPermissionMode] = useState<'owner' | 'player'>('owner')
  const [gameSettings, setGameSettings] = useState<Record<string, unknown>>({})
  const [creating, setCreating] = useState(false)

  const selectedGame: GameConfig | undefined = GAME_REGISTRY[selectedSlug]

  useEffect(() => {
    if (initialGame) {
      setSelectedSlug(initialGame)
    }
  }, [initialGame])

  useEffect(() => {
    if (selectedGame) {
      setGameSettings(selectedGame.defaultSettings)
      setMaxPlayers(selectedGame.maxPlayers > 6 ? 6 : selectedGame.maxPlayers)
    }
  }, [selectedSlug])

  function handleCreate() {
    setCreating(true)
    onCreateRoom(selectedSlug, maxPlayers, permissionMode, gameSettings)
  }

  if (!selectedGame) return null

  const SettingsComponent = selectedGame.components.RoomSettings
  const cardsPerPlayer = selectedSlug === 'takht' ? Math.floor(52 / maxPlayers) : null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogTitle>Create Room</DialogTitle>

      <div className="space-y-6">
        {/* Game Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]">Game</label>
          <div className="grid grid-cols-2 gap-2">
            {games.map((game) => (
              <button
                key={game.slug}
                onClick={() => setSelectedSlug(game.slug)}
                className={`p-3 rounded-[var(--radius-md)] border text-left transition-colors ${
                  selectedSlug === game.slug
                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-gold-dim)]'
                }`}
              >
                <span className="text-lg">{game.icon}</span>
                <p className="text-sm font-medium mt-1">{game.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{game.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Max Players */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]">
            Max Players ({selectedGame.minPlayers}–{selectedGame.maxPlayers})
          </label>
          <input
            type="range"
            min={selectedGame.minPlayers}
            max={selectedGame.maxPlayers}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full accent-[var(--color-gold)]"
            aria-label="Maximum players"
          />
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-muted)]">{selectedGame.minPlayers}</span>
            <span className="text-[var(--color-gold)] font-semibold">{maxPlayers} players</span>
            <span className="text-[var(--color-muted)]">{selectedGame.maxPlayers}</span>
          </div>
          {cardsPerPlayer && (
            <p className="text-xs text-[var(--color-muted)] text-center">
              {cardsPerPlayer} cards per player • {cardsPerPlayer} hands per round
            </p>
          )}
        </div>

        {/* Permission Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]">Score Entry Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPermissionMode('owner')}
              className={`p-3 rounded-[var(--radius-md)] border text-center text-sm transition-colors ${
                permissionMode === 'owner'
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-gold-dim)]'
              }`}
            >
              <p className="font-medium">Host Controls</p>
              <p className="text-xs text-[var(--color-muted)]">Owner enters all scores</p>
            </button>
            <button
              onClick={() => setPermissionMode('player')}
              className={`p-3 rounded-[var(--radius-md)] border text-center text-sm transition-colors ${
                permissionMode === 'player'
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-gold-dim)]'
              }`}
            >
              <p className="font-medium">Each Player</p>
              <p className="text-xs text-[var(--color-muted)]">Players enter own scores</p>
            </button>
          </div>
        </div>

        {/* Game-Specific Settings */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]">Game Settings</label>
          <SettingsComponent settings={gameSettings} onChange={setGameSettings} />
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </Dialog>
  )
}