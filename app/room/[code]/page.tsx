'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { ensureSession, getStoredSession } from '@/lib/engine/session'
import { Lobby } from '@/components/platform/Lobby'
import { RoomPhaseRouter } from '@/components/platform/RoomPhaseRouter'
import type { RoomRow, PlayerRow } from '@/lib/engine/types'

export default function RoomPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const [room, setRoom] = useState<RoomRow | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<PlayerRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    let isMounted = true
    const supabase = createBrowserClient()

    async function init() {
      try {
        await ensureSession(supabase)
        const session = await getStoredSession(supabase)
        if (!session) {
          if (isMounted) {
            setError('Failed to establish session')
            setLoading(false)
          }
          return
        }

        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single()

        if (roomError || !roomData) {
          if (isMounted) {
            setError('Room not found')
            setLoading(false)
          }
          return
        }

        if (!isMounted) return
        setRoom(roomData as RoomRow)

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id)
          .order('joined_at', { ascending: true })

        if (!isMounted) return
        const playersList = (playersData || []) as PlayerRow[]
        setPlayers(playersList)

        const me = playersList.find(
          (p) => p.auth_id === session.user.id
        )
        setCurrentPlayer(me || null)

        // Subscribe to realtime changes
        const channel = supabase
          .channel(`room-db-${roomData.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rooms',
              filter: `id=eq.${roomData.id}`,
            },
            (payload) => {
              if (!isMounted) return
              if (payload.eventType === 'UPDATE') {
                setRoom(payload.new as RoomRow)
              } else if (payload.eventType === 'DELETE') {
                setError('Room has been closed')
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'players',
              filter: `room_id=eq.${roomData.id}`,
            },
            (payload) => {
              if (!isMounted) return
              if (payload.eventType === 'INSERT') {
                setPlayers((prev) => [...prev, payload.new as PlayerRow])
              } else if (payload.eventType === 'UPDATE') {
                setPlayers((prev) =>
                  prev.map((p) =>
                    p.id === (payload.new as PlayerRow).id
                      ? (payload.new as PlayerRow)
                      : p
                  )
                )
                // Update current player if it's us
                const updated = payload.new as PlayerRow
                if (updated.auth_id === session.user.id) {
                  setCurrentPlayer(updated)
                }
              } else if (payload.eventType === 'DELETE') {
                setPlayers((prev) =>
                  prev.filter((p) => p.id !== (payload.old as { id: string }).id)
                )
              }
            }
          )
          .subscribe()

        channelRef.current = channel
        if (isMounted) setLoading(false)
      } catch (err) {
        if (isMounted) {
          setError('Failed to load room')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [code])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-muted)]">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-[var(--color-red)] text-lg">{error}</p>
          <a
            href="/"
            className="px-6 py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  if (!room) return null

  if (room.status === 'lobby') {
    return (
      <Lobby
        room={room}
        players={players}
        currentPlayer={currentPlayer}
      />
    )
  }

  return (
    <RoomPhaseRouter
      room={room}
      players={players}
      currentPlayer={currentPlayer}
    />
  )
}