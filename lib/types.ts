export interface CaseHighlight {
  country_of_birth?: string
  citizenship?: string
  industry?: string
  visa_type?: string
  commentary?: string
}

export interface Attorney {
  id: string
  name: string
  bio: string | null
  // do_not_send: true → unavailable, false → available
  do_not_send: boolean
  do_not_send_reason: string | null  // reason why attorney is unavailable
  is_available: boolean // derived: !do_not_send
  employment_type: string | null
  primary_visas: string[]
  secondary_visas: string[]
  industries: string[]
  languages: string[]
  case_strengths: string[]
  case_capabilities: string[]
  case_highlights: CaseHighlight[]
  // New fields
  conversion_rate: number | null
  cal_slug: string | null                // cal.com slug for matching with availability
  scheduling_link: string | null           // single fallback link (free → first)
  scheduling_links: Record<string, string> // all links keyed by label e.g. { free: '...', '99': '...' }
  years_of_experience: string | null   // e.g. "10 YEARS 10 months"
  num_cases: number | null
  approval_rate: string | null          // e.g. "90%" — stored as-is from overall_rate
  google_summary: string | null
  testimonial_excerpts: string[]        // from testimonial_excerpts column
  email: string | null
  // Live availability from Google Sheet (refreshed every 30 min)
  earliest_availability: string | null  // e.g. "Apr 15" or "Immediately"
  availability_status: string | null    // e.g. "Available", "Busy", "On Leave"
  consult_slots_this_week: number | null  // number of consult slots available this week
  consult_slots_next_week: number | null  // number of consult slots available next week
  consult_slots_following_week: number | null // number of consult slots available the week after
}

export type CaseStrength = 'Strong' | 'Medium' | 'Weak'
