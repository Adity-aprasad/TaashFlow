import type { SupabaseClient } from '@supabase/supabase-js'
import type { RoomRow, PlayerRow } from './types'
import { generateRoomCode, getRandomAvatarColor } from '@/lib/utils'

/**
 * Creates a new room in the database with the given settings.
 * Also creates the owner as the first player in the room.
 */
export async function createRoom(
  supabase: SupabaseClient,
  authId: string,
  displayName: string,
  gameSlug: string,
  maxPlayers: number,
  permissionMode: 'owner' | 'player',
  gameSettings: Record<string, unknown>
): Promise<{ room: RoomRow; player: PlayerRow } | { error: string }> {
  const code = generateRoomCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code,
      owner_id: authId,
      game_slug: gameSlug,
      max_players: maxPlayers,
      permission_mode: permissionMode,
      game_settings: gameSettings,
    })
    .select()
    .single()

  if (roomError || !room) {
    return { error: roomError?.message || 'Failed to create room' }
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      auth_id: authId,
      display_name: displayName,
      avatar_color: getRandomAvatarColor(),
      is_owner: true,
      is_ready: true,
    })
    .select()
    .single()

  if (playerError || !player) {
    await supabase.from('rooms').delete().eq('id', room.id)
    return { error: playerError?.message || 'Failed to create player' }
  }

  return { room: room as RoomRow, player: player as PlayerRow }
}

/**
 * Joins an existing room by its code.
 */
export async function joinRoom(
  supabase: SupabaseClient,
  authId: string,
  displayName: string,
  roomCode: string
): Promise<{ room: RoomRow; player: PlayerRow } | { error: string }> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode.toUpperCase())
    .single()

  if (roomError || !room) {
    return { error: 'Room not found' }
  }

  // Check if already in room
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('auth_id', authId)
    .single()

  if (existingPlayer) {
    return { room: room as RoomRow, player: existingPlayer as PlayerRow }
  }

  if (room.status !== 'lobby') {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        auth_id: authId,
        display_name: displayName,
        avatar_color: getRandomAvatarColor(),
        is_spectator: true,
      })
      .select()
      .single()

    if (playerError || !player) {
      return { error: 'Failed to join as spectator' }
    }
    return { room: room as RoomRow, player: player as PlayerRow }
  }

  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  if ((count || 0) >= room.max_players) {
    return { error: 'Room is full' }
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      auth_id: authId,
      display_name: displayName,
      avatar_color: getRandomAvatarColor(),
    })
    .select()
    .single()

  if (playerError || !player) {
    return { error: playerError?.message || 'Failed to join room' }
  }

  return { room: room as RoomRow, player: player as PlayerRow }
}

/**
 * Removes a player from a room.
 */
export async function leaveRoom(
  supabase: SupabaseClient,
  playerId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Kicks a player from the room. Only the owner can do this.
 */
export async function kickPlayer(
  supabase: SupabaseClient,
  targetPlayerId: string,
  roomId: string,
  ownerAuthId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: ownerPlayer } = await supabase
    .from('players')
    .select('is_owner')
    .eq('room_id', roomId)
    .eq('auth_id', ownerAuthId)
    .single()

  if (!ownerPlayer?.is_owner) {
    return { success: false, error: 'Only the owner can kick players' }
  }

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', targetPlayerId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Transfers room ownership to the next player (by join order).
 */
export async function transferOwnership(
  supabase: SupabaseClient,
  roomId: string,
  currentOwnerId: string
): Promise<{ newOwnerId: string } | { error: string }> {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_spectator', false)
    .eq('is_eliminated', false)
    .neq('id', currentOwnerId)
    .order('joined_at', { ascending: true })

  if (!players || players.length === 0) {
    return { error: 'No eligible players for ownership transfer' }
  }

  const newOwner = players[0]

  await supabase
    .from('players')
    .update({ is_owner: false })
    .eq('id', currentOwnerId)

  await supabase
    .from('players')
    .update({ is_owner: true })
    .eq('id', newOwner.id)

  await supabase
    .from('rooms')
    .update({ owner_id: newOwner.auth_id })
    .eq('id', roomId)

  return { newOwnerId: newOwner.id }
}

/**
 * Updates the room's last_activity timestamp.
 */
export async function touchRoom(
  supabase: SupabaseClient,
  roomId: string
): Promise<void> {
  await supabase
    .from('rooms')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', roomId)
}