'use server'

import { bustAvailabilityCache } from '@/lib/google-sheets'

export async function refreshAvailabilityAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await bustAvailabilityCache()
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
