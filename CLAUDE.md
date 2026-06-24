# B2B Attorney Hub — Claude Code Brief

## Goal
A B2B internal tool for the Manifest Law **sales team** to route and schedule consultations with the right attorney for B2B clients. **Do not modify the B2C repo** (`v0-attorney-profile-database`).

---

## Architecture (current)

The tool is a **standalone HTML page** backed by a **Google Apps Script web app**. The Google Sheet is the single source of truth for attorney data.

```
Google Sheet (source of truth)
    ↓  Apps Script doGet()
HTML Tool (consultation routing + directory)
    ↓  Apps Script doPost()
Assignment Log tab (Google Sheet)
```

**No Supabase.** **No Cal.com.** The Next.js repo exists but is not the active routing tool — the HTML prototype is.

---

## Repos & URLs

| What | Where |
|---|---|
| B2B GitHub repo | `github.com/manifestlaw-labs/v0-b2b-attorney-hub` (private) |
| B2C repo (read-only reference) | `github.com/manifestlaw-labs/v0-attorney-profile-database` |
| Google Sheet (source of truth) | `https://docs.google.com/spreadsheets/d/1bEPvJ-B5qCL170Q8Gt0TtZmIRQIldmfBVtmD1qLy-A4` |
| **Live dashboard (Claude artifact)** | `https://claude.ai/code/artifact/2d04803d-4be4-4156-a474-14b94701c00f` |
| **Static snapshot (shareable)** | `https://claude.ai/code/artifact/22ae3fbc-b870-47b9-b362-efee10d85b06` |
| **Apps Script (committed)** | `AttorneyDataEndpoint.gs` in repo root |
| **HTML dashboard (committed)** | `dashboard.html` in repo root |

---

## Live Configuration

**Apps Script URL (deployed, public):**
```
https://script.google.com/macros/s/AKfycbx5CWOVy2RXr9WkHe-U-OkA5J2ajdxKqQZknyli8kO8fgxOiN0kbLFfruw1RVdJUcMz/exec
```
- Deployed as: Web App · Execute as: Me · **Who has access: Anyone** (not domain-restricted)
- The domain-scoped URL format (`/a/macros/manifestlaws.com/...`) causes CORS failures — always use the public format (`/macros/s/.../exec`)
- BigQuery Advanced Service must be enabled in Apps Script editor (Services → BigQuery API)

**Route Consultation password:** `manifest2025`

---

## Deliverables

### 1. `AttorneyDataEndpoint.gs` — Apps Script backend
Canonical copy: repo root. Paste into Google Sheet → Extensions → Apps Script.

**`doGet()`** — returns JSON:
```json
{
  "attorneys": [ ...attorney objects... ],
  "podCapacity": { "pod-slug": { "podName", "utilization", "label", "lastRefreshed", "productionAttorneys" } },
  "updated": "ISO timestamp"
}
```

Each attorney object includes: `name, email, podSlug, slug, clientSizes, tags, doNotSend, link, scores, languages, industries, yearsOfExperience, isPracticeLead, tier, maxLoad, weightedLoad`

**`doPost()`** — appends a row to the Assignment Log tab.

**`refreshFromBQ()`** — pulls active case counts from BigQuery (`manifestlaw-prod`), calculates weighted loads (visa_count × visa_weight), writes `weighted_load` to Attorney Capacity tab. Pod Capacity formulas recalculate automatically. Run via daily 6 AM trigger (`createBQRefreshTrigger()`) or on demand via `?action=refreshBQ`.

**Key Apps Script functions:**
- `splitOutsideParens(str)` — splits comma-separated industry strings without breaking on commas inside parentheses (e.g. `"Tech (e.g., engineers, founders)"` stays as one item)
- `readPodCapacity()` — filters out non-slug rows (e.g. `⚙ = auto-computed...` comment rows) using `/^[a-z0-9-]+$/.test(slug)`; cross-references Attorney Capacity tab to populate `productionAttorneys` per pod
- `readAttorneys()` — reads Attorneys tab, handles Nadia & Lucia split via `NAME_MAP`

### 2. HTML Consultation Routing Tool (`dashboard.html`)
Local copy committed at `dashboard.html` in the repo root.

**Tab structure:**
- **B2B Pods** (default) — 5 practice lead flip cards with filter bar
- **Route Consultation** — password-gated (`manifest2025`), 4-step wizard

**Flip card behavior:**
- Drives from `Object.keys(POD_CAPACITY)` — adding/removing pods from sheet automatically adds/removes cards
- Nadia Zaidi & Lucia Maxwell merged into one card
- Front: attorney info, booking link, industries, languages, strong visa types
- Back: pod name, utilization %, High/Medium/Low badge, production attorney names, last BQ refresh
- "Tap to see capacity →" hint is `position: sticky; bottom: 0` — always visible
- Filter bar: language, industry, visa type filters

**Password gate:** clicking Route Consultation shows a modal; password `manifest2025` unlocks for the session.

**BQ Refresh button:** fetches `APPS_SCRIPT_URL?action=refreshBQ`, runs full BQ query → updates weighted_load → re-renders cards with fresh capacity data.

**Fallback data:** hardcoded in HTML, used automatically when fetch fails. Mirrors live sheet data as of 2026-06-24.

---

## Google Sheet Structure

**URL:** `https://docs.google.com/spreadsheets/d/1bEPvJ-B5qCL170Q8Gt0TtZmIRQIldmfBVtmD1qLy-A4`

| Tab | Purpose | Read/Write |
|---|---|---|
| Attorneys | Attorney profiles + visa scores (1–5) | Read |
| Legend | Score meanings + tag descriptions | Reference only |
| Attorney Capacity | email → pod_slug map, tier, max_load, weighted_load, is_practice_lead | Read + BQ writes weighted_load |
| Pod Capacity | pod_slug → pod_name, utilization, capacity_label, last_refreshed | Read + BQ writes last_refreshed |
| Visa Weights | visa_type → weight (for BQ weighted load calc) | Reference only |
| Assignment Log | One row per completed routing | Append via doPost |

### Attorneys tab structure
- Row 1: Section label headers (spans cols)
- Row 2: Column headers (`name`, `slug`, `email`, `client_sizes`, `scheduling_link`, `do_not_send`, `tags`, `Languages`, `Industries`, `Year of Experience`, then 30 visa columns H–AK)
- Row 3+: Attorney data (9 attorneys as of 2026-06-24)

### Visa scoring scale
| Score | Meaning | Effect on routing |
|---|---|---|
| 5 | Expert — always preferred | Included |
| 4 | Strong — preferred | Included |
| 3 | Capable — neutral | Included (min threshold) |
| 2 | Limited | Excluded |
| 1 | No experience | Excluded |
| 0 | Not answered | Excluded |

---

## Attorneys (as of 2026-06-24)

| Name | Slug | Pod | Client Sizes | Tags | do_not_send |
|---|---|---|---|---|---|
| Nadia & Lucia | nadia-lucia | nadia-lucia | SMB, Mid-Market, Enterprise | Seller, Practice Lead | **TRUE** |
| Matt Dillinger | matt-dillinger | matt-dillinger | SMB, Mid-Market, Enterprise | Seller, Practice Lead | false |
| Nandini Nair | nandini-nair | nandini-nair | SMB, Mid-Market | Seller, Practice Lead | false |
| David Santiago | david-santiago | kyle-mclaughlin | Micro SMB, SMB | Seller, Production Attorney | false |
| Kyle McLaughlin | kyle-mclaughlin | kyle-mclaughlin | SMB, Mid-Market | Seller, Practice Lead | false |
| Arielle Sheinfeld | arielle-sheinfeld | arielle-sheinfeld | Micro SMB, SMB, Mid-Market | Seller, Practice Lead | false |
| Mayra Faz | mayra-faz | **nandini-nair** | Micro SMB, SMB | Production Attorney | false |
| Cheryl Kilborn | cheryl-kilborn | matt-dillinger | Micro SMB, SMB | Production Attorney | false |
| Blake Burch | blake-burch | matt-dillinger | Micro SMB, SMB | Production Attorney | false |
| Ana Louzada | — (Attorney Capacity only) | kyle-mclaughlin | Micro SMB, SMB | Production Attorney | false |

**Notes:**
- Nadia & Lucia: one sheet row, `&`-separated emails; Apps Script splits into two attorney objects. `do_not_send: true` — excluded from routing but shown in directory.
- Ana Louzada: in Attorney Capacity tab but NOT in Attorneys tab. Shows in pod card back via `readPodCapacity()` cross-reference.
- Mayra Faz is in Nandini's pod (not Matt's) per the Attorney Capacity tab.

---

## Consultation Routing Logic

Routing wizard shows only **Sellers** (`tags.includes('Seller')`) who are **not** `do_not_send`.

**Step 1 — Client Size:** filter `a.clientSizes.includes(selectedSize)`

**Step 2 — Visa Types:**
- Known visas: attorney must score **≥ 3** on every selected visa
- Unknown / TBD: show all available sellers for that client size (no visa filter)

**Step 3 — Date:** optional, captured for notes only (no availability check)

**Step 4 — Results:** sorted by average visa score across selected visas (highest first)

---

## Pod Capacity (as of 2026-06-24 BQ refresh)

| Pod | Utilization | Label | Production Attorneys |
|---|---|---|---|
| Matt Dillinger's Pod | 25% | High | Cheryl Kilborn, Blake Burch |
| Nandini Nair's Pod | 7% | High | Mayra Faz |
| Kyle McLaughlin's Pod | 91% | Low | David Santiago, Ana Louzada |
| Arielle Sheinfeld's Pod | 93% | Low | — |
| Nadia & Lucia's Pod | 70% | Medium | — |

---

## Key Decisions Made

1. **Google Sheet is the source of truth** — not Supabase, not Next.js.
2. **Cal.com eliminated from routing** — no OOO check. Date field is for notes only.
3. **Standalone HTML tool, not Next.js** — simpler to deploy, no infra dependency.
4. **Seller tag drives routing eligibility** — Nadia & Lucia have `do_not_send: true` but are shown in directory.
5. **do_not_send = excluded from wizard, shown in directory** — intentional.
6. **Visa score threshold = 3** — "Capable or better" on all selected visas.
7. **BQ for capacity data** — weighted load = SUM(case_count × visa_weight) per attorney.
8. **Public Apps Script deployment** — "Anyone" access (not org-restricted) required for CORS to work from localhost/artifact.
9. **Dynamic pod cards** — driven from `Object.keys(POD_CAPACITY)`, not filtered attorney list. New pods appear automatically.
10. **productionAttorneys in pod JSON** — sourced from Attorney Capacity tab cross-reference, not Attorneys tab. Handles attorneys (like Ana Louzada) who are in capacity but not the attorneys tab.

---

## Next Steps

### Immediate
- [x] Apps Script deployed (public, Anyone access)
- [x] APPS_SCRIPT_URL set in dashboard.html
- [x] Route Consultation tab enabled + password-gated
- [x] BQ trigger enabled (run `createBQRefreshTrigger()` once — installs daily 6 AM refresh)
- [ ] Wire up `doPost()` from HTML → log assignments to Assignment Log tab
- [ ] Add AE name + company fields to routing results step (for the log)

### Hosting
- [ ] Decide: Google Sites embed, direct artifact share, or deploy to `v0-b2b-attorney-hub.manifestlabs.dev`
- [ ] Vercel project creation (if Next.js hub still needed for attorney profile management)

---

## Reference: Production Assignment Script

A separate, more complex Apps Script exists for the **Micro SMB production assignment tool**. Key differences from our tool:
- Includes Cal.com OOO checking (our tool has none)
- Handles both consult AND production attorney assignment
- Has a Google Sheets form UI (ours is an HTML page)
- Uses Attorney Preferences tab (ours uses raw scores)

Do not confuse the two systems. Ours is consult-only, HTML-based, no Cal.com.
