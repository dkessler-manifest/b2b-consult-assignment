/**
 * Fetches attorney availability data from a public Google Sheet.
 * The sheet must be shared publicly (Anyone with the link → Viewer).
 * 
 * Expected columns: Name, Cal Slug, Earliest Availability, Status, True Bkgs (J-L)
 */

const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? ''
const GID = process.env.GOOGLE_SHEETS_GID ?? ''

// Use gviz/tq with explicit column selection to get ALL columns A through L
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}&tq=${encodeURIComponent('select A,B,C,D,E,F,G,H,I,J,K,L')}`

export interface AvailabilityData {
  name: string
  calSlug: string | null
  earliestAvailability: string | null
  status: string | null
  consultSlotsThisWeek: number | null
  consultSlotsNextWeek: number | null
  consultSlotsFollowingWeek: number | null
}

// Simple in-memory cache with TTL
let cachedData: AvailabilityData[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Force-bust the in-memory cache and re-fetch fresh data from the sheet.
 */
export async function bustAvailabilityCache(): Promise<AvailabilityData[]> {
  cachedData = null
  cacheTimestamp = 0
  return fetchAvailabilityData()
}

/**
 * Parse CSV text into rows. Handles quoted fields with commas and newlines.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (char === '\r') i++ // skip the \n in \r\n
      row.push(current.trim())
      if (row.some(cell => cell !== '')) {
        rows.push(row)
      }
      row = []
      current = ''
    } else {
      current += char
    }
  }
  
  // Push last row if exists
  if (current || row.length > 0) {
    row.push(current.trim())
    if (row.some(cell => cell !== '')) {
      rows.push(row)
    }
  }
  
  return rows
}

/**
 * Create a lookup map for quick name-based matching.
 */
export function createAvailabilityLookup(data: AvailabilityData[]): Map<string, AvailabilityData> {
  const lookup = new Map<string, AvailabilityData>()
  for (const item of data) {
    lookup.set(item.name.toLowerCase().trim(), item)
  }
  return lookup
}

/**
 * Fetch availability data from the Google Sheet.
 * Returns cached data if within TTL, otherwise fetches fresh data.
 */
export async function fetchAvailabilityData(): Promise<AvailabilityData[]> {
  if (!SHEET_ID) return []

  const now = Date.now()

  // Return cached data if still valid
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedData
  }

  try {
    const response = await fetch(SHEET_CSV_URL, {
      next: { revalidate: 1800 } // Cache for 30 minutes on the edge
    })
    
    if (!response.ok) {
      console.error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`)
      return cachedData ?? []
    }
    
    const csvText = await response.text()
    const rows = parseCSV(csvText)
    
    if (rows.length < 2) {
      console.error('Google Sheet has no data rows')
      return cachedData ?? []
    }
    
    // Find column indices from header row (case-insensitive)
    const headers = rows[0].map(h => h.toLowerCase().trim())
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('attorney'))
    const calSlugIdx = headers.findIndex(h => h.includes('slug'))
    const availIdx = headers.findIndex(h => h.includes('earliest') || h.includes('availability'))
    const statusIdx = headers.findIndex(h => h.includes('status'))
    
    // Find all "bkgs" columns in order - they should be the True Bkgs columns
    const bkgsIndices: number[] = []
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].includes('bkgs')) {
        bkgsIndices.push(i)
      }
    }
    
    const slotsIdx = bkgsIndices[0] ?? -1
    const slotsNextIdx = bkgsIndices[1] ?? -1
    const slotsFollowingIdx = bkgsIndices[2] ?? -1
    
    if (nameIdx === -1) {
      console.error('Could not find name column in Google Sheet')
      return cachedData ?? []
    }
    
    // Parse data rows
    const data: AvailabilityData[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const name = row[nameIdx]?.trim()
      
      if (!name) continue
      
      const rawSlots = slotsIdx !== -1 ? row[slotsIdx]?.trim() : null
      const parsedSlots = rawSlots ? parseInt(rawSlots, 10) : null
      const rawSlotsNext = slotsNextIdx !== -1 ? row[slotsNextIdx]?.trim() : null
      const parsedSlotsNext = rawSlotsNext ? parseInt(rawSlotsNext, 10) : null
      const rawSlotsFollowing = slotsFollowingIdx !== -1 ? row[slotsFollowingIdx]?.trim() : null
      const parsedSlotsFollowing = rawSlotsFollowing ? parseInt(rawSlotsFollowing, 10) : null

      data.push({
        name,
        calSlug: calSlugIdx !== -1 ? (row[calSlugIdx]?.trim() || null) : null,
        earliestAvailability: availIdx !== -1 ? (row[availIdx]?.trim() || null) : null,
        status: statusIdx !== -1 ? (row[statusIdx]?.trim() || null) : null,
        consultSlotsThisWeek: parsedSlots !== null && !isNaN(parsedSlots) ? parsedSlots : null,
        consultSlotsNextWeek: parsedSlotsNext !== null && !isNaN(parsedSlotsNext) ? parsedSlotsNext : null,
        consultSlotsFollowingWeek: parsedSlotsFollowing !== null && !isNaN(parsedSlotsFollowing) ? parsedSlotsFollowing : null,
      })
    }
    

    
    // Update cache
    cachedData = data
    cacheTimestamp = now
    
    return data
  } catch (error) {
    console.error('Error fetching Google Sheet:', error)
    return cachedData ?? []
  }
}
