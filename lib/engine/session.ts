import type { SupabaseClient, Session } from '@supabase/supabase-js'

const PLAYER_NAME_KEY = 'takht_player_name'
const ROOM_CODE_KEY = 'takht_room_code'

/**
 * Ensures the user has an anonymous Supabase session.
 */
export async function ensureSession(
  supabase: SupabaseClient
): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    return session
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    console.error('Failed to create anonymous session:', error.message)
    return null
  }

  return data.session
}

/**
 * Gets the current stored session without creating a new one.
 */
export async function getStoredSession(
  supabase: SupabaseClient
): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Stores the player's display name in localStorage.
 */
export function storePlayerName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_NAME_KEY, name)
  }
}

/**
 * Retrieves the stored player name from localStorage.
 */
export function getStoredPlayerName(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(PLAYER_NAME_KEY) || ''
  }
  return ''
}

/**
 * Stores the current room code for reconnection.
 */
export function storeRoomCode(code: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ROOM_CODE_KEY, code)
  }
}

/**
 * Gets the stored room code.
 */
export function getStoredRoomCode(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ROOM_CODE_KEY)
  }
  return null
}

/**
 * Clears the stored room code.
 */
export function clearStoredRoomCode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ROOM_CODE_KEY)
  }
}