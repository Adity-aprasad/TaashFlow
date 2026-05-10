'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createBrowserClient } from '@/lib/supabase/client'
import { ensureSession, getStoredPlayerName, storePlayerName, getStoredRoomCode, storeRoomCode, clearStoredRoomCode } from '@/lib/engine/session'
import { createRoom, joinRoom } from '@/lib/engine/room'
import { checkReconnection } from '@/lib/engine/cleanup'
import { CreateRoomModal } from './CreateRoomModal'
import { Spade, Users, BarChart3 } from 'lucide-react'

/**
 * Home screen component.
 * Name input + Create Room + Join Room + Score Tracker options.
 * Handles reconnection banner if player was in an active room.
 */
export function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState<string>('takht')
  const [reconnectCode, setReconnectCode] = useState<string | null>(null)

  useEffect(() => {
    setName(getStoredPlayerName())
    const storedCode = getStoredRoomCode()
    if (storedCode) {
      checkReconnectability(storedCode)
    }
  }, [])

  async function checkReconnectability(code: string) {
    const supabase = createBrowserClient()
    const session = await ensureSession(supabase)
    if (!session) return
    const result = await checkReconnection(supabase, session.user.id, code)
    if (result.canReconnect) {
      setReconnectCode(code)
    } else {
      clearStoredRoomCode()
    }
  }

  function validateName(): boolean {
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters')
      return false
    }
    if (name.trim().length > 20) {
      setError('Name must be 20 characters or less')
      return false
    }
    setError('')
    return true
  }

  async function handleJoin() {
    if (!validateName()) return
    if (joinCode.trim().length !== 6) {
      setError('Room code must be 6 characters')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createBrowserClient()
    const session = await ensureSession(supabase)
    if (!session) {
      setError('Failed to connect. Please refresh.')
      setLoading(false)
      return
    }

    const result = await joinRoom(supabase, session.user.id, name.trim(), joinCode.trim().toUpperCase())

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    storePlayerName(name.trim())
    storeRoomCode(result.room.code)
    router.push(`/room/${result.room.code}`)
  }

  async function handleCreateRoom(gameSlug: string, maxPlayers: number, permissionMode: 'owner' | 'player', gameSettings: Record<string, unknown>) {
    if (!validateName()) return
    setLoading(true)
    setError('')

    const supabase = createBrowserClient()
    const session = await ensureSession(supabase)
    if (!session) {
      setError('Failed to connect. Please refresh.')
      setLoading(false)
      return
    }

    const result = await createRoom(
      supabase,
      session.user.id,
      name.trim(),
      gameSlug,
      maxPlayers,
      permissionMode,
      gameSettings
    )

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    storePlayerName(name.trim())
    storeRoomCode(result.room.code)
    setShowCreateModal(false)
    router.push(`/room/${result.room.code}`)
  }

  function handleRejoin() {
    if (reconnectCode) {
      router.push(`/room/${reconnectCode}`)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Takht
          </h1>
          <p className="text-[var(--color-muted)] text-sm">
            Multiplayer Card Game Platform
          </p>
        </div>

        {/* Reconnection Banner */}
        {reconnectCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-[var(--color-gold)]/10 border border-[var(--color-gold-dim)] rounded-[var(--radius-lg)]"
          >
            <p className="text-sm text-[var(--color-gold)] mb-2">
              You were in a game (Room: {reconnectCode})
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRejoin}
                className="flex-1 py-2 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] text-sm font-semibold"
              >
                Rejoin
              </button>
              <button
                onClick={() => { clearStoredRoomCode(); setReconnectCode(null) }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-muted)]"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-lg placeholder:text-[var(--color-muted)] focus:border-[var(--color-gold)] focus:outline-none transition-colors"
            aria-label="Display name"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-[var(--color-red)] text-center">{error}</p>
        )}

        {/* Create Room */}
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
          className="w-full h-14 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-lg)] font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Spade size={20} />
          Create Room
        </button>

        {/* Join Room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ROOM CODE"
            maxLength={6}
            className="flex-1 h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-center font-mono text-lg tracking-widest placeholder:text-[var(--color-muted)] placeholder:tracking-normal placeholder:font-sans focus:border-[var(--color-gold)] focus:outline-none transition-colors uppercase"
            aria-label="Room code"
          />
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 6}
            className="h-12 px-6 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] font-semibold text-[var(--color-text)] hover:border-[var(--color-gold)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Users size={16} />
            Join
          </button>
        </div>

        {/* Score Tracker shortcut */}
        <button
          onClick={() => { setSelectedGame('generic'); setShowCreateModal(true) }}
          disabled={loading}
          className="w-full h-10 bg-transparent border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-text)] transition-colors flex items-center justify-center gap-2"
        >
          <BarChart3 size={14} />
          Score Tracker (any game)
        </button>
      </motion.div>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={handleCreateRoom}
        initialGame={selectedGame}
      />
    </div>
  )
}