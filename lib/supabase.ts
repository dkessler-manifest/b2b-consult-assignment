import type { Attorney, CaseHighlight } from './types'
import { fetchAvailabilityData, type AvailabilityData } from './google-sheets'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// Service role key bypasses RLS - needed for INSERT/UPDATE/DELETE operations
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const TABLE = process.env.SUPABASE_TABLE_NAME ?? 'b2b_attorney_profile'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY')
}

/** Guarantees a value is always a plain JS array. Handles null, undefined, and non-array types. */
function toArr<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return []
}

/** Normalize a raw attorney row so every array field is always a real JS array. */
function normalizeAttorney(raw: Record<string, unknown>): Attorney {
  // do_not_send=true means unavailable; do_not_send=false/null means available
  const doNotSend = Boolean(raw.do_not_send)

  // scheduling_links is a JSON object of label→URL pairs e.g. { free: '...', '99': '...', '349': '...' }
  let schedulingLink: string | null = null
  let schedulingLinksObj: Record<string, string> = {}
  const schedulingLinks = raw.scheduling_links
  if (typeof schedulingLinks === 'string') {
    try {
      const parsed = JSON.parse(schedulingLinks) as Record<string, string>
      schedulingLinksObj = parsed
      schedulingLink = parsed['free'] ?? parsed['99'] ?? Object.values(parsed)[0] ?? null
    } catch { /* ignore parse errors */ }
  } else if (typeof schedulingLinks === 'object' && schedulingLinks !== null) {
    schedulingLinksObj = schedulingLinks as Record<string, string>
    schedulingLink = schedulingLinksObj['free'] ?? schedulingLinksObj['99'] ?? Object.values(schedulingLinksObj)[0] ?? null
  }

  // overall_rate comes as a percentage string e.g. "90%" — store as-is
  const overallRate = (raw.overall_rate as string | null) ?? null

  // testimonial_excerpts is a text[] array used as success stories
  const testimonials = toArr<string>(raw.testimonial_excerpts)

  // industries can come as either an array or a comma-separated string
  let industries: string[] = []
  if (Array.isArray(raw.industries)) {
    industries = raw.industries as string[]
  } else if (typeof raw.industries === 'string' && raw.industries.trim()) {
    industries = raw.industries.split(',').map((ind) => ind.trim()).filter(Boolean)
  }

  return {
    id: raw.id as string,
    name: raw.name as string,
    bio: (raw.bio as string | null) ?? null,
    do_not_send: doNotSend,
    do_not_send_reason: (raw.do_not_send_reason as string | null) ?? null,
    is_available: !doNotSend,
    employment_type: (raw.employment_type as string | null) ?? null,
    primary_visas: toArr<string>(raw.primary_visas),
    secondary_visas: toArr<string>(raw.secondary_visas),
    industries: industries,
    languages: toArr<string>(raw.languages),
    case_strengths: toArr<string>(raw.case_strengths),
    case_capabilities: toArr<string>(raw.case_capabilities),
    case_highlights: toArr<CaseHighlight>(raw.case_highlights),
    testimonial_excerpts: testimonials,
    conversion_rate: (raw.conversion_rate as number | null) ?? null,
    cal_slug: (raw.cal_slug as string | null) ?? null,
    scheduling_link: schedulingLink,
    scheduling_links: schedulingLinksObj,
    years_of_experience: (raw.years_experience as string | null) ?? null,
    num_cases: (raw.number_of_clients as number | null) ?? null,
    approval_rate: overallRate,
    google_summary: (raw.google_summary as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    metropolitan_area: (raw.metropolitan_area as string | null) ?? null,
    // These will be populated from Google Sheets data
    earliest_availability: null,
    availability_status: null,
    consult_slots_this_week: null,
    consult_slots_next_week: null,
    consult_slots_following_week: null,
  }
}

const READ_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Accept-Profile': 'attorney_consultation',
  'Accept': 'application/json'
}

// Use service role key for writes to bypass RLS, fall back to anon key for read-only
const WRITE_HEADERS = {
  'apikey': SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY}`,
  'Accept-Profile': 'attorney_consultation',
  'Content-Profile': 'attorney_consultation',
  'Content-Type': 'application/json',
}

export async function fetchAttorneys(): Promise<Attorney[]> {
  // Fetch attorneys from Supabase and availability from Google Sheets in parallel
  const [response, availabilityData] = await Promise.all([
    fetch(`${SUPABASE_URL}/${TABLE}?select=*`, {
      method: 'GET',
      headers: READ_HEADERS
    }),
    fetchAvailabilityData()
  ])

  if (!response.ok) {
    throw new Error(`Failed to fetch attorneys: ${response.statusText}`)
  }

  const rows: Record<string, unknown>[] = await response.json()
  const attorneys = Array.isArray(rows) ? rows.map(normalizeAttorney) : []
  
  // Create cal_slug lookup from Google Sheet data (column B - slug)
  const calSlugLookup = new Map<string, AvailabilityData>()
  for (const data of availabilityData) {
    if (data.calSlug) {
      calSlugLookup.set(data.calSlug.toLowerCase().trim(), data)
    }
  }
  
  for (const attorney of attorneys) {
    // Match by cal_slug only
    const availability = attorney.cal_slug 
      ? calSlugLookup.get(attorney.cal_slug.toLowerCase().trim()) 
      : undefined
    
    if (availability) {
      attorney.earliest_availability = availability.earliestAvailability
      attorney.availability_status = availability.status
      attorney.consult_slots_this_week = availability.consultSlotsThisWeek
      attorney.consult_slots_next_week = availability.consultSlotsNextWeek
      attorney.consult_slots_following_week = availability.consultSlotsFollowingWeek
      
      // Sync is_available with the Google Sheet status to avoid conflicts
      const statusLower = (availability.status ?? '').toLowerCase()
      if (statusLower.includes('green') || statusLower.includes('available')) {
        attorney.is_available = true
      } else if (statusLower.includes('red') || statusLower.includes('unavailable') || statusLower.includes('not available')) {
        attorney.is_available = false
      }
      // If status doesn't match known keywords, keep the database value
    }
  }
  
  return attorneys
}

export async function fetchAttorneyById(id: string): Promise<Attorney | null> {
  const response = await fetch(`${SUPABASE_URL}/${TABLE}?id=eq.${id}&select=*`, {
    method: 'GET',
    headers: READ_HEADERS
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch attorney: ${response.statusText}`)
  }

  const data: Record<string, unknown>[] = await response.json()
  const row = Array.isArray(data) ? data[0] : null
  return row ? normalizeAttorney(row) : null
}

export async function updateAttorney(id: string, updates: Partial<Attorney>): Promise<void> {
  // Map frontend Attorney field names back to Supabase column names
  const payload: Record<string, unknown> = {}
  if ('name' in updates)                payload.name = updates.name
  if ('bio' in updates)                 payload.bio = updates.bio
  if ('employment_type' in updates)     payload.employment_type = updates.employment_type
  if ('do_not_send' in updates)         payload.do_not_send = updates.do_not_send
  if ('do_not_send_reason' in updates)  payload.do_not_send_reason = updates.do_not_send_reason
  if ('primary_visas' in updates)       payload.primary_visas = updates.primary_visas
  if ('secondary_visas' in updates)     payload.secondary_visas = updates.secondary_visas
  if ('industries' in updates)          payload.industries = Array.isArray(updates.industries) ? updates.industries.join(', ') : updates.industries
  if ('languages' in updates)           payload.languages = updates.languages
  if ('case_strengths' in updates)      payload.case_strengths = updates.case_strengths
  if ('case_capabilities' in updates)   payload.case_capabilities = updates.case_capabilities
  if ('case_highlights' in updates)     payload.case_highlights = updates.case_highlights
  if ('scheduling_link' in updates)     payload.scheduling_links = updates.scheduling_link
  if ('scheduling_links' in updates)    payload.scheduling_links = updates.scheduling_links
  if ('years_of_experience' in updates) payload.years_experience = updates.years_of_experience
  if ('google_summary' in updates)      payload.google_summary = updates.google_summary
  if ('email' in updates)               payload.email = updates.email
  if ('metropolitan_area' in updates)   payload.metropolitan_area = updates.metropolitan_area

  const response = await fetch(`${SUPABASE_URL}/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: WRITE_HEADERS,
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to update attorney: ${response.statusText} — ${text}`)
  }
}

export async function createAttorney(data: {
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
  metropolitan_area?: string | null
}): Promise<string> {
  // Map to Supabase column names
  const payload: Record<string, unknown> = {
    name: data.name,
    bio: data.bio ?? null,
    employment_type: data.employment_type ?? null,
    do_not_send: data.do_not_send ?? false,
    do_not_send_reason: data.do_not_send_reason ?? null,
    primary_visas: data.primary_visas ?? [],
    secondary_visas: data.secondary_visas ?? [],
    industries: (data.industries ?? []).join(', '),
    languages: data.languages ?? [],
    case_strengths: data.case_strengths ?? [],
    case_capabilities: data.case_capabilities ?? [],
    years_experience: data.years_of_experience ?? null,
    google_summary: data.google_summary ?? null,
    scheduling_links: data.scheduling_links ?? {},
    email: data.email ?? null,
    metropolitan_area: data.metropolitan_area ?? null,
  }

  const response = await fetch(`${SUPABASE_URL}/${TABLE}`, {
    method: 'POST',
    headers: {
      ...WRITE_HEADERS,
      'Prefer': 'return=representation', // Return the created row
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to create attorney: ${response.statusText} — ${text}`)
  }

  const [created] = await response.json()
  return created.id as string
}
