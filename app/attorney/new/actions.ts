'use server'

// Server action to create attorney with service role key (bypasses RLS)
import { createAttorney } from '@/lib/supabase'

export async function createAttorneyAction(data: {
  name: string
  bio?: string | null
  employment_type?: string | null
  do_not_send?: boolean
  do_not_send_reason?: string | null
  primary_visas?: string[]
  secondary_visas?: string[]
  industries?: string[]
  languages?: string[]
  case_strengths?: string[]
  case_capabilities?: string[]
  years_of_experience?: string | null
  google_summary?: string | null
  scheduling_links?: Record<string, string>
  email?: string | null
}): Promise<string> {
  return createAttorney(data)
}
