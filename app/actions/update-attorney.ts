'use server'

// Server action to update attorney with service role key (bypasses RLS).
// Required because process.env.SUPABASE_SERVICE_ROLE_KEY is only available
// server-side; calling updateAttorney directly from a client component would
// fall back to the anon key and silently update 0 rows under RLS.
import { updateAttorney } from '@/lib/supabase'
import type { Attorney } from '@/lib/types'

export async function updateAttorneyAction(
  id: string,
  updates: Partial<Attorney>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateAttorney(id, updates)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
