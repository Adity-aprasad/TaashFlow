import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Handles client-side cleanup when a player leaves a room.
 */
export async function cleanupOnLeave(
  supabase: SupabaseClient,
  playerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)

  if (error) {
    console.error('Failed to cleanup player on leave:', error.message)
    return false
  }
  return true
}

/**
 * Checks if a room still exists and the player is still in it.
 */
export async function checkReconnection(
  supabase: SupabaseClient,
  authId: string,
  roomCode: string
): Promise<{ canReconnect: boolean; roomId?: string; playerId?: string }> {
  const { data: room } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', roomCode)
    .single()

  if (!room) {
    return { canReconnect: false }
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', room.id)
    .eq('auth_id', authId)
    .single()

  if (!player) {
    return { canReconnect: false }
  }

  return {
    canReconnect: true,
    roomId: room.id,
    playerId: player.id,
  }
}