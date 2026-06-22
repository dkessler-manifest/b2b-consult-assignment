'use client'

import type { Attorney } from '@/lib/types'

interface SummaryTabProps {
  attorneys: Attorney[]
}

type ColorBucket = 'green' | 'yellow' | 'orange' | 'red'

function getColorBucket(attorney: Attorney): ColorBucket {
  if (attorney.do_not_send) return 'red'
  const s = (attorney.availability_status ?? '').toLowerCase()
  if (s.includes('red') || s.includes('unavailable') || s.includes('not available')) return 'red'
  if (s.includes('yellow')) return 'yellow'
  if (s.includes('orange')) return 'orange'
  if (s.includes('green') || s.includes('available')) return 'green'
  return attorney.is_available ? 'green' : 'red'
}

const COLOR_LABELS: Record<ColorBucket, string> = {
  green: 'Green',
  yellow: 'Yellow',
  orange: 'Orange',
  red: 'Red',
}

const COLOR_STYLES: Record<ColorBucket, { dot: string; row: string; text: string }> = {
  green:  { dot: 'bg-green-500',  row: 'bg-green-50/60',  text: 'text-green-800'  },
  yellow: { dot: 'bg-yellow-400', row: 'bg-yellow-50/60', text: 'text-yellow-800' },
  orange: { dot: 'bg-orange-400', row: 'bg-orange-50/60', text: 'text-orange-800' },
  red:    { dot: 'bg-red-500',    row: 'bg-red-50/60',    text: 'text-red-800'    },
}

const COLORS: ColorBucket[] = ['green', 'yellow', 'orange', 'red']

export function SummaryTab({ attorneys }: SummaryTabProps) {
  const rows = COLORS.map((color) => {
    const group = attorneys.filter((a) => getColorBucket(a) === color)
    const count = group.length

    const sumSlots = (key: 'consult_slots_this_week' | 'consult_slots_next_week' | 'consult_slots_following_week') => {
      const total = group.reduce((acc, a) => acc + (a[key] ?? 0), 0)
      const hasData = group.some((a) => a[key] !== null)
      return hasData ? total : null
    }

    return {
      color,
      count,
      thisWeek: sumSlots('consult_slots_this_week'),
      nextWeek: sumSlots('consult_slots_next_week'),
      followingWeek: sumSlots('consult_slots_following_week'),
    }
  })

  const totals = {
    count: rows.reduce((a, r) => a + r.count, 0),
    thisWeek: rows.some(r => r.thisWeek !== null)
      ? rows.reduce((a, r) => a + (r.thisWeek ?? 0), 0)
      : null,
    nextWeek: rows.some(r => r.nextWeek !== null)
      ? rows.reduce((a, r) => a + (r.nextWeek ?? 0), 0)
      : null,
    followingWeek: rows.some(r => r.followingWeek !== null)
      ? rows.reduce((a, r) => a + (r.followingWeek ?? 0), 0)
      : null,
  }

  const fmt = (n: number | null) => (n === null ? '—' : String(n))

  const hasAnyNextWeek = rows.some(r => r.nextWeek !== null)
  const hasAnyFollowingWeek = rows.some(r => r.followingWeek !== null)

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Consult Slots by Status
      </h2>
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-foreground">Attorneys</th>
              <th className="text-center px-4 py-3 font-semibold text-foreground">This Week</th>
              {hasAnyNextWeek && (
                <th className="text-center px-4 py-3 font-semibold text-foreground">Next Week</th>
              )}
              {hasAnyFollowingWeek && (
                <th className="text-center px-4 py-3 font-semibold text-foreground">Following Week</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = COLOR_STYLES[row.color]
              return (
                <tr key={row.color} className={`border-b border-border last:border-0 ${style.row}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block size-2.5 rounded-full ${style.dot}`} />
                      <span className={`font-medium ${style.text}`}>{COLOR_LABELS[row.color]}</span>
                    </div>
                  </td>
                  <td className={`text-center px-4 py-3 font-medium ${style.text}`}>{row.count}</td>
                  <td className={`text-center px-4 py-3 font-medium ${style.text}`}>{fmt(row.thisWeek)}</td>
                  {hasAnyNextWeek && (
                    <td className={`text-center px-4 py-3 font-medium ${style.text}`}>{fmt(row.nextWeek)}</td>
                  )}
                  {hasAnyFollowingWeek && (
                    <td className={`text-center px-4 py-3 font-medium ${style.text}`}>{fmt(row.followingWeek)}</td>
                  )}
                </tr>
              )
            })}
            {/* Totals row */}
            <tr className="bg-muted/60 border-t-2 border-border font-semibold">
              <td className="px-4 py-3 text-foreground">Total</td>
              <td className="text-center px-4 py-3 text-foreground">{totals.count}</td>
              <td className="text-center px-4 py-3 text-foreground">{fmt(totals.thisWeek)}</td>
              {hasAnyNextWeek && (
                <td className="text-center px-4 py-3 text-foreground">{fmt(totals.nextWeek)}</td>
              )}
              {hasAnyFollowingWeek && (
                <td className="text-center px-4 py-3 text-foreground">{fmt(totals.followingWeek)}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      {!hasAnyNextWeek && !hasAnyFollowingWeek && (
        <p className="text-xs text-muted-foreground mt-2">
          Next week and following week columns are not yet in the Google Sheet.
        </p>
      )}
    </div>
  )
}
