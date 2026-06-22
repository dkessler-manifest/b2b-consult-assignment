# B2B Attorney Hub — Claude Code Brief

## Goal
Duplicate the existing B2C attorney directory (`v0-attorney-profile-database`) into a new B2B version. **Do not modify the original repo.**

---

## Existing B2C Repo
- GitHub: `https://github.com/manifestlaw-labs/v0-attorney-profile-database` (private, under `manifestlaw-labs` org)
- Live URL: `https://v0-attorney-profile-database.manifestlabs.dev`
- v0 project: `https://v0.app/chat/projects/prj_WlHwcbPMBGetparLL60jHxcwH4It`

## New B2B Repo Target
- GitHub repo name: `v0-b2b-attorney-hub` (create new private repo under `manifestlaw-labs`)
- Suggested URL: `https://v0-b2b-attorney-hub.manifestlabs.dev`

---

## Tech Stack
- **Framework:** Next.js 16 App Router (TypeScript)
- **Database:** Supabase REST API (raw fetch, no SDK) — schema: `attorney_consultation`, table: `attorney_profile`
- **Availability:** Google Sheets (public CSV via `gviz/tq`) — 30-min in-memory cache
- **Scheduling:** Cal.com private links via ManifestOS API (`MANIFEST_API_URL/api/calcom/v1/private-links`)
- **Data fetching:** SWR
- **UI:** shadcn/ui + Tailwind 4 + Radix
- **Auth gate:** Simple sessionStorage passcode (`manifest2025`)
- **Deployment:** Vercel (auto-deploy on merge to main via v0)

---

## Key File Structure
```
app/
  page.tsx                  # Renders <AttorneyDirectory />
  layout.tsx                # Title, fonts, metadata
  globals.css
  actions/
    refresh-availability.ts # Server action: busts Google Sheets cache
    update-attorney.ts      # Server action: PATCH attorney record
  attorney/new/             # Add new attorney form
  profile/                  # Attorney profile/edit page

lib/
  types.ts                  # Attorney interface + CaseHighlight
  constants.ts              # VISA_GROUPS, INDUSTRIES, CASE_STRENGTHS, etc.
  supabase.ts               # fetchAttorneys(), fetchAttorneyById(), updateAttorney(), createAttorney()
  google-sheets.ts          # Fetches availability CSV, 30-min cache, bustAvailabilityCache()
  utils.ts                  # cn() helper
  actions/
    private-links.ts        # generatePrivateLink() server action

components/
  attorney-directory.tsx    # Main directory UI, SWR fetch, cards, filters, summary tab
  search-filters.tsx        # Filter panel (status, availability, visa, industry, strength, language)
  profile-editor.tsx        # Attorney edit form
  summary-tab.tsx           # Consult slots table by status color
  passcode-gate.tsx         # Passcode wall (sessionStorage)
  manifest-logo.tsx         # SVG logo
  ui/                       # Full shadcn/ui component set
```

---

## Attorney Data Schema (`lib/types.ts`)
```typescript
interface Attorney {
  id: string
  name: string
  bio: string | null
  do_not_send: boolean
  do_not_send_reason: string | null
  is_available: boolean
  employment_type: string | null        // "PT CC", "W2", "EXCLUSIVE CC", "CONSULT CC"
  primary_visas: string[]
  secondary_visas: string[]
  industries: string[]
  languages: string[]
  case_strengths: string[]              // "Strong" | "Medium" | "Weak"
  case_capabilities: string[]           // "RFEs", "NOIDs", "Rush Cases", etc.
  case_highlights: CaseHighlight[]
  conversion_rate: number | null
  cal_slug: string | null
  scheduling_link: string | null
  scheduling_links: Record<string, string>
  years_of_experience: string | null
  num_cases: number | null
  approval_rate: string | null
  google_summary: string | null
  testimonial_excerpts: string[]
  email: string | null
  earliest_availability: string | null
  availability_status: string | null    // drives GREEN/YELLOW/ORANGE/RED badge
  consult_slots_this_week: number | null
  consult_slots_next_week: number | null
  consult_slots_following_week: number | null
}
```

---

## Environment Variables (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co/rest/v1
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MANIFEST_API_URL=https://api-v2.manifestlaw.com
MANIFEST_API_KEY=<bearer-token>
```

---

## Changes Needed for B2B

### 1. Branding / Metadata (`app/layout.tsx`)
```typescript
// Change:
title: 'Manifest Law — Attorney Hub'
description: 'Internal attorney directory and profile management for Manifest Law'

// To:
title: 'Manifest Law — B2B Attorney Hub'
description: 'Internal B2B attorney directory and profile management for Manifest Law'
```

### 2. Supabase Table Name (`lib/supabase.ts`)
The B2C version hardcodes `attorney_profile` as the table name in the `attorney_consultation` schema.
Change every reference from `attorney_profile` to whatever the B2B table is named.
**Ask Daniel what the B2B Supabase table name is before making this change.**
As a fallback, use an env var: `process.env.SUPABASE_TABLE_NAME ?? 'b2b_attorney_profile'`

### 3. Google Sheets URL (`lib/google-sheets.ts`)
The B2C version has a hardcoded Google Sheets URL for availability data.
**Ask Daniel if there's a separate Google Sheet for B2B availability, or if B2B attorneys won't use Google Sheets at all.**
If no separate sheet, you can disable the Google Sheets merge entirely and rely solely on Supabase data.

### 4. `.env.example`
Add: `SUPABASE_TABLE_NAME=b2b_attorney_profile`

### 5. Everything else stays the same
- Same Attorney schema/types
- Same UI components
- Same filter panel
- Same Summary tab
- Same passcode (`manifest2025`) — or ask Daniel if B2B needs a different one

---

## Deployment Steps (after code is ready)
1. Create new private GitHub repo `v0-b2b-attorney-hub` under `manifestlaw-labs` org
2. Push the B2B codebase to it
3. Go to `v0.app` → New Project → Import from GitHub → select `v0-b2b-attorney-hub`
4. Set env vars in Vercel (same Supabase project, different table)
5. Set custom domain `v0-b2b-attorney-hub.manifestlabs.dev`

---

## Outstanding Questions for Daniel
1. **What is the B2B Supabase table name?** (already created, or needs to be created?)
2. **Is there a Google Sheet for B2B availability?** (or manual/no availability sync?)
3. **What subdomain should the B2B hub live at?**
4. **Does the B2B version need a different passcode?**
5. **Any field/filter differences?** (Daniel said "same fields, maybe a few small tweaks" — confirm what those are)
