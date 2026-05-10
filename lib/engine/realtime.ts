import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { BroadcastEventName, BroadcastEvents } from './types'

/**
 * Creates and subscribes to a Supabase Realtime channel for a room.
 */
export function createRoomChannel(
  supabase: SupabaseClient,
  roomCode: string,
  playerId: string,
  onBroadcast: (event: string, payload: Record<string, unknown>) => void,
  onPresenceSync: (state: Record<string, unknown[]>) => void
): RealtimeChannel {
  const channel = supabase.channel(`room:${roomCode}`, {
    config: {
      presence: { key: playerId },
    },
  })

  channel.on('broadcast', { event: '*' }, (payload) => {
    onBroadcast(payload.event, payload.payload as Record<string, unknown>)
  })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    onPresenceSync(state as Record<string, unknown[]>)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        player_id: playerId,
        online_at: new Date().toISOString(),
      })
    }
  })

  return channel
}

/**
 * Sends a broadcast event to all players in a room channel.
 */
export function broadcastEvent<E extends BroadcastEventName>(
  channel: RealtimeChannel,
  event: E,
  payload: BroadcastEvents[E]
): void {
  channel.send({
    type: 'broadcast',
    event,
    payload,
  })
}

/**
 * Removes player from presence and unsubscribes from channel.
 */
export async function cleanupChannel(
  supabase: SupabaseClient,
  channel: RealtimeChannel
): Promise<void> {
  await channel.untrack()
  supabase.removeChannel(channel)
}