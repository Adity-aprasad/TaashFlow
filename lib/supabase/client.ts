import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase browser client for client-side operations.
 */
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}