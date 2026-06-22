'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { SearchFilters } from './search-filters'
import { SummaryTab } from './summary-tab'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { fetchAttorneys } from '@/lib/supabase'
import { generatePrivateLink } from '@/lib/actions/private-links'
import { refreshAvailabilityAction } from '@/app/actions/refresh-availability'
import { VISA_GROUPS } from '@/lib/constants'
import type { Attorney, CaseHighlight } from '@/lib/types'
import { Settings, Clock, CheckCircle2, TrendingUp, Star, Calendar, ChevronDown, Plus, RefreshCw, MapPin } from 'lucide-react'
import { toast } from 'sonner'

// Helper to compute status badge color class
function computeBadgeColor(status: string | null | undefined, isAvailable: boolean, doNotSend: boolean, doNotSendReason: string | null | undefined): string {
  // Priority 1: DO NOT SEND flag - always red
  if (doNotSend) return 'bg-red-50 text-red-700 border-red-200'

  // Priority 2: Check availability status
  const s = (status ?? '').toLowerCase()
  if (s.includes('red') || s.includes('unavailable') || s.includes('not available'))
    return 'bg-red-50 text-red-700 border-red-200'
  if (s.includes('yellow'))
    return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  if (s.includes('orange'))
    return 'bg-orange-50 text-orange-700 border-orange-200'
  if (s.includes('green') || s.includes('available'))
    return 'bg-green-50 text-green-700 border-green-200'
  return isAvailable
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200'
}

// Helper to get color bucket for sorting
function computeColorBucket(status: string | null | undefined, isAvailable: boolean, doNotSend: boolean, doNotSendReason: string | null | undefined): string {
  // Priority 1: DO NOT SEND flag - always red bucket
  if (doNotSend) return 'red'

  // Priority 2: Check availability status
  const s = (status ?? '').toLowerCase()
  if (s.includes('red') || s.includes('unavailable') || s.includes('not available')) return 'red'
  if (s.includes('yellow')) return 'yellow'
  if (s.includes('orange')) return 'orange'
  if (s.includes('green') || s.includes('available')) return 'green'
  return isAvailable ? 'green' : 'red'
}

function AttorneyCard({ attorney, onClick }: { attorney: Attorney; onClick: () => void }) {
  const safeArr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : [])
  const fmtPct = (n: number | null | undefined): string | null =>
    n == null ? null : `${Math.round(n * 100)}%`

  const [loadingLink, setLoadingLink] = useState<string | null>(null)

  const handleBookingClick = async (e: React.MouseEvent, url: string, label: string) => {
    e.stopPropagation()
    if (!attorney.email) {
      toast.warning('Email not set, falling back to public URL')
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 1000)
      return
    }
    setLoadingLink(label)
    try {
      const result = await generatePrivateLink({ calComUrl: url, attorneyEmail: attorney.email })
      if ('error' in result) {
        toast.warning(`${result.error}; Falling back to public URL`)
        setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 1000)
      } else {
        await navigator.clipboard.writeText(result.bookingUrl).catch(() => { })
        window.open(result.bookingUrl, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setLoadingLink(null)
    }
  }

  // Compute badge color inline
  const badgeColorClass = computeBadgeColor(attorney.availability_status, attorney.is_available, attorney.do_not_send ?? false, attorney.do_not_send_reason)

  const primaryVisas = safeArr(attorney.primary_visas)
  const industries = safeArr(attorney.industries)
  const caseStrengths = safeArr(attorney.case_strengths)
  const caseCapabilities = safeArr(attorney.case_capabilities)
  const languages = safeArr(attorney.languages)

  const displayedVisas = primaryVisas.slice(0, 4)
  const moreVisasCount = Math.max(0, primaryVisas.length - 4)
  const displayedIndustries = industries.slice(0, 3)
  const moreIndustriesCount = Math.max(0, industries.length - 3)

  const approvalPct = attorney.approval_rate ?? null
  const conversionPct = fmtPct(attorney.conversion_rate)

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`View profile for ${attorney.name}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="cursor-pointer transition-all duration-200 border-border bg-white hover:border-foreground/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-serif font-bold text-foreground leading-snug">{attorney.name}</h3>
          <Badge className={`shrink-0 text-xs font-normal border ${badgeColorClass}`}>
            {attorney.do_not_send ? 'RED' : (attorney.availability_status || (attorney.is_available ? 'Available' : 'Unavailable'))}
          </Badge>
        </div>
        {attorney.email && (
          <p className="text-xs text-muted-foreground mt-0.5">{attorney.email}</p>
        )}

        {(attorney.earliest_availability || attorney.availability_status) && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {attorney.earliest_availability && (
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Calendar className="size-3 text-muted-foreground" />
                {attorney.earliest_availability}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {attorney.employment_type && (
              <p className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">{attorney.employment_type}</p>
            )}
            {attorney.metropolitan_area && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                {attorney.employment_type && <span className="text-muted-foreground/40">·</span>}
                <MapPin className="size-3 shrink-0" />
                {attorney.metropolitan_area}
              </p>
            )}
          </div>
          {Object.keys(attorney.scheduling_links ?? {}).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[#3D2817] hover:underline underline-offset-2">
                  Book consultation
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {Object.entries(attorney.scheduling_links)
                  .sort(([a], [b]) => {
                    if (a.toLowerCase() === 'free') return -1
                    if (b.toLowerCase() === 'free') return 1
                    return Number(a) - Number(b)
                  })
                  .map(([label, url]) => {
                    const isEmpty = !url || url.trim() === ''
                    return (
                      <DropdownMenuItem key={label} asChild>
                        <button
                          onClick={(e) => !isEmpty && handleBookingClick(e, url, label)}
                          disabled={loadingLink === label || isEmpty}
                          className={`flex items-center justify-between gap-4 w-full ${isEmpty ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                        >
                          <span className={`capitalize ${isEmpty ? 'line-through' : ''}`}>
                            {loadingLink === label ? 'Generating...' : label.replace(/_/g, ' ')}
                          </span>
                          {/^\d+$/.test(label) && loadingLink !== label && (
                            <span className="text-muted-foreground text-xs">${label}</span>
                          )}
                        </button>
                      </DropdownMenuItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {attorney.do_not_send_reason && (
          <p className="text-xs text-red-600 mt-1 italic">{attorney.do_not_send_reason}</p>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        {displayedIndustries.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Industries</p>
            <div className="flex flex-wrap gap-1">
              {displayedIndustries.map((industry, i) => (
                <Badge key={`ind-${i}`} variant="outline" className="text-xs font-normal">
                  {industry}
                </Badge>
              ))}
              {moreIndustriesCount > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{moreIndustriesCount} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {languages.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Languages</p>
            <div className="flex flex-wrap gap-1">
              {languages.map((lang, i) => (
                <Badge key={`lang-${i}`} variant="outline" className="text-xs font-normal">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {displayedVisas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Primary Visas</p>
            <div className="flex flex-wrap gap-1">
              {displayedVisas.map((visa, i) => (
                <Badge key={`visa-${i}`} variant="outline" className="text-xs font-normal">
                  {visa}
                </Badge>
              ))}
              {moreVisasCount > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{moreVisasCount} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {caseStrengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Case Strength</p>
            <div className="flex flex-wrap gap-1">
              {caseStrengths.map((strength, i) => (
                <Badge key={`strength-${i}`} variant="outline" className="text-xs font-normal">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {caseCapabilities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Case Capabilities</p>
            <div className="flex flex-wrap gap-1">
              {caseCapabilities.slice(0, 5).map((cap, i) => (
                <Badge key={`cap-${i}`} variant="outline" className="text-xs font-normal">
                  {cap}
                </Badge>
              ))}
              {caseCapabilities.length > 5 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{caseCapabilities.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-2">
          {approvalPct && (
            <div className="flex flex-col items-start">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Approval Rate</p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="size-4 text-success" />
                <span className="text-sm font-semibold">{approvalPct}</span>
              </div>
            </div>
          )}
          {conversionPct && (
            <div className="flex flex-col items-start">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Conversion</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="size-4 text-foreground/60" />
                <span className="text-sm font-semibold">{conversionPct}</span>
              </div>
            </div>
          )}
          {attorney.years_of_experience && (
            <div className="flex flex-col items-start">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Experience</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="size-4 text-foreground/60" />
                <span className="text-sm font-semibold">{attorney.years_of_experience} yrs</span>
              </div>
            </div>
          )}
          {attorney.consult_slots_this_week != null && (
            <div className="flex flex-col items-start">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Slots This Week</p>
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="size-4 text-foreground/60" />
                <span className="text-sm font-semibold">{attorney.consult_slots_this_week}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AttorneyDirectory() {
  const { data: attorneys, error, isLoading, mutate } = useSWR('attorneys', fetchAttorneys)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const result = await refreshAvailabilityAction()
      if (!result.success) {
        console.error('[v0] Refresh failed:', result.error)
        return
      }
      // Force a fresh fetch from the server
      await mutate(undefined, { revalidate: true })
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('[v0] Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }
  const [selectedVisaCategory, setSelectedVisaCategory] = useState<string | null>(null)
  const [selectedVisa, setSelectedVisa] = useState<string | null>(null)
  const [selectedCaseStrength, setSelectedCaseStrength] = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [selectedAvailability, setSelectedAvailability] = useState<'available' | 'unavailable' | null>(null)
  const [selectedStatusColor, setSelectedStatusColor] = useState<string | null>(null)
  const [selectedCaseCapability, setSelectedCaseCapability] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [selectedAttorney, setSelectedAttorney] = useState<Attorney | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'directory' | 'summary'>('directory')

  const filteredAttorneys = useMemo(() => {
    if (!attorneys) return []

    return attorneys
      .filter((attorney) => {
        // Always exclude inactive attorneys
        if (attorney.employment_type?.toUpperCase() === 'NOT ACTIVE') return false

        if (selectedAvailability === 'available' && !attorney.is_available) return false
        if (selectedAvailability === 'unavailable' && attorney.is_available) return false

        if (selectedStatusColor) {
          const colorBucket = computeColorBucket(attorney.availability_status, attorney.is_available, attorney.do_not_send ?? false, attorney.do_not_send_reason)
          if (colorBucket !== selectedStatusColor) return false
        }

        if (selectedVisaCategory) {
          const categoryVisas = VISA_GROUPS[selectedVisaCategory as keyof typeof VISA_GROUPS] || []
          const categoryVisasLower = categoryVisas.map((v) => v.toLowerCase())
          const attorneyVisas = [...(attorney.primary_visas || []), ...(attorney.secondary_visas || [])]
          const hasMatchingVisa = attorneyVisas.some((visa) => {
            const visaLower = visa.toLowerCase()
            return categoryVisasLower.some((cv) =>
              visaLower === cv || visaLower.includes(cv) || cv.includes(visaLower)
            )
          })
          if (!hasMatchingVisa) return false
        }

        if (selectedVisa) {
          const attorneyVisas = [...(attorney.primary_visas || []), ...(attorney.secondary_visas || [])]
          const selectedVisaLower = selectedVisa.toLowerCase()
          // Check for exact match or partial match (handles "/" variations like "F-1 OPT/STEM OPT")
          const hasVisa = attorneyVisas.some((visa) => {
            const visaLower = visa.toLowerCase()
            return visaLower === selectedVisaLower ||
              visaLower.includes(selectedVisaLower) ||
              selectedVisaLower.includes(visaLower)
          })
          if (!hasVisa) return false
        }

        if (selectedIndustry) {
          const selectedIndustryLower = selectedIndustry.toLowerCase()
          // Split on "/" to match any part of compound industries like "Entrepreneurs/Founders"
          const selectedParts = selectedIndustryLower.split('/').map(p => p.trim())
          const hasIndustry = (attorney.industries || []).some((ind) => {
            const indLower = ind.toLowerCase()
            const indParts = indLower.split('/').map(p => p.trim())
            // Check if any part matches
            return indLower === selectedIndustryLower ||
              indParts.some(ip => selectedParts.some(sp => ip.includes(sp) || sp.includes(ip))) ||
              indLower.includes(selectedIndustryLower) ||
              selectedIndustryLower.includes(indLower)
          })
          if (!hasIndustry) return false
        }

        if (selectedCaseStrength) {
          const selectedStrengthLower = selectedCaseStrength.toLowerCase()
          const hasStrength = (attorney.case_strengths || []).some((strength) => {
            const strengthLower = strength.toLowerCase()
            return strengthLower === selectedStrengthLower ||
              strengthLower.includes(selectedStrengthLower) ||
              selectedStrengthLower.includes(strengthLower)
          })
          if (!hasStrength) return false
        }

        if (selectedCaseCapability) {
          const selectedCapLower = selectedCaseCapability.toLowerCase()
          const hasCap = (attorney.case_capabilities || []).some((cap) => {
            const capLower = cap.toLowerCase()
            return capLower === selectedCapLower ||
              capLower.includes(selectedCapLower) ||
              selectedCapLower.includes(capLower)
          })
          if (!hasCap) return false
        }

        if (selectedLanguage) {
          const selectedLangLower = selectedLanguage.toLowerCase()
          const hasLang = (attorney.languages || []).some((lang) =>
            lang.toLowerCase() === selectedLangLower
          )
          if (!hasLang) return false
        }

        if (search) {
          const q = search.toLowerCase()
          const nameMatch = attorney.name?.toLowerCase().includes(q)
          const visaMatch = [...(attorney.primary_visas || []), ...(attorney.secondary_visas || [])].some((v) =>
            v.toLowerCase().includes(q)
          )
          const industryMatch = (attorney.industries || []).some((ind) => ind.toLowerCase().includes(q))
          const strengthMatch = (attorney.case_strengths || []).some((s) => s.toLowerCase().includes(q))
          const capabilityMatch = (attorney.case_capabilities || []).some((cap) => cap.toLowerCase().includes(q))
          const bioMatch = attorney.bio?.toLowerCase().includes(q)
          const languageMatch = (attorney.languages || []).some((lang) => lang.toLowerCase().includes(q))
          if (!nameMatch && !visaMatch && !industryMatch && !strengthMatch && !capabilityMatch && !bioMatch && !languageMatch) return false
        }

        return true
      })
      .sort((a, b) => {
        const colorPriority: Record<string, number> = { green: 0, yellow: 1, orange: 2, red: 3 }
        const aColor = computeColorBucket(a.availability_status, a.is_available, a.do_not_send ?? false, a.do_not_send_reason)
        const bColor = computeColorBucket(b.availability_status, b.is_available, b.do_not_send ?? false, b.do_not_send_reason)
        const aPriority = colorPriority[aColor] ?? 3
        const bPriority = colorPriority[bColor] ?? 3
        if (aPriority !== bPriority) return aPriority - bPriority

        const aDate = a.earliest_availability ? new Date(a.earliest_availability).getTime() : Infinity
        const bDate = b.earliest_availability ? new Date(b.earliest_availability).getTime() : Infinity
        if (aDate !== bDate) return aDate - bDate

        return a.name.localeCompare(b.name)
      })
  }, [attorneys, search, selectedVisaCategory, selectedVisa, selectedCaseStrength, selectedIndustry, selectedAvailability, selectedStatusColor, selectedCaseCapability, selectedLanguage])

  // Derive unique sorted language list from all attorney data
  const allLanguages = useMemo(() => {
    if (!attorneys) return []
    const langs = new Set<string>()
    for (const a of attorneys) {
      for (const lang of a.languages || []) {
        if (lang && lang.trim()) langs.add(lang.trim())
      }
    }
    return Array.from(langs).sort()
  }, [attorneys])

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center text-red-600">
          <p>Failed to load attorneys. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[#3D2817]/20 bg-gradient-to-r from-white to-[#3D2817]/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground">Manifest Law</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Attorney Directory</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="h-2" />
              <Button
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-[#3D2817] hover:bg-[#2D1C10] text-white"
              >
                <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Availability'}
              </Button>
              <p className="text-xs text-muted-foreground h-2">
                {lastRefreshed
                  ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </p>
            </div>
            <Link href="/attorney/new">
              <Button size="sm" className="bg-[#3D2817] hover:bg-[#2D1C10] text-white">
                <Plus className="size-4 mr-2" />
                Add Attorney
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-border mb-8">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'directory'
                ? 'border-[#3D2817] text-[#3D2817]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Directory
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'summary'
                ? 'border-[#3D2817] text-[#3D2817]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Summary
          </button>
        </div>

        {activeTab === 'summary' ? (
          isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <SummaryTab attorneys={attorneys ?? []} />
          )
        ) : (
          <>
            <SearchFilters
              search={search}
              onSearchChange={setSearch}
              selectedVisaCategory={selectedVisaCategory}
              onVisaCategoryChange={setSelectedVisaCategory}
              selectedVisa={selectedVisa}
              onVisaChange={setSelectedVisa}
              selectedCaseStrength={selectedCaseStrength}
              onCaseStrengthChange={setSelectedCaseStrength}
              selectedIndustry={selectedIndustry}
              onIndustryChange={setSelectedIndustry}
              selectedAvailability={selectedAvailability}
              onAvailabilityChange={setSelectedAvailability}
              selectedStatusColor={selectedStatusColor}
              onStatusColorChange={setSelectedStatusColor}
              selectedCaseCapability={selectedCaseCapability}
              onCaseCapabilityChange={setSelectedCaseCapability}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              availableLanguages={allLanguages}
            />

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-8 mb-6">
                  {filteredAttorneys.length} {filteredAttorneys.length === 1 ? 'attorney' : 'attorneys'} available
                </p>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAttorneys.map((attorney) => (
                    <AttorneyCard
                      key={attorney.id}
                      attorney={attorney}
                      onClick={() => {
                        setSelectedAttorney(attorney)
                        setDrawerOpen(true)
                      }}
                    />
                  ))}
                </div>

                {filteredAttorneys.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No attorneys match your search criteria.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {selectedAttorney && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden bg-white">
            {/* Fixed header */}
            <SheetHeader className="shrink-0 p-8 pb-6 border-b">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-3xl font-serif font-bold text-foreground">{selectedAttorney.name}</SheetTitle>
                <Link href={`/profile/${selectedAttorney.id}`} className="shrink-0">
                  <Button size="sm" className="bg-[#3D2817] hover:bg-[#2D1C10] text-white rounded-none mt-1">
                    <Settings className="size-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
              <SheetDescription className="text-sm text-muted-foreground mt-2">
                {selectedAttorney.employment_type && `${selectedAttorney.employment_type} • `}
                {selectedAttorney.availability_status || (selectedAttorney.is_available ? 'Available for new cases' : 'Not currently available')}
                {selectedAttorney.earliest_availability && ` • Next available: ${selectedAttorney.earliest_availability}`}
              </SheetDescription>
              {selectedAttorney.do_not_send_reason && (
                <p className="text-xs text-red-600 mt-2 italic">{selectedAttorney.do_not_send_reason}</p>
              )}
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">

                {/* Stats row */}
                {(selectedAttorney.years_of_experience || selectedAttorney.approval_rate || selectedAttorney.conversion_rate) && (
                  <div className="flex flex-wrap gap-6">
                    {selectedAttorney.years_of_experience != null && (
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Experience</p>
                          <p className="text-sm font-semibold">{selectedAttorney.years_of_experience} yrs</p>
                        </div>
                      </div>
                    )}
                    {selectedAttorney.approval_rate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-600" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Approval Rate</p>
                          <p className="text-sm font-semibold">{selectedAttorney.approval_rate}</p>
                        </div>
                      </div>
                    )}
                    {selectedAttorney.conversion_rate != null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversion</p>
                          <p className="text-sm font-semibold">{Math.round(selectedAttorney.conversion_rate * 100)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bio */}
                {selectedAttorney.bio && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">About</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{selectedAttorney.bio}</p>
                  </div>
                )}

                {/* Google summary */}
                {selectedAttorney.google_summary && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Summary</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{selectedAttorney.google_summary}</p>
                  </div>
                )}

                {/* Industries */}
                {selectedAttorney.industries && selectedAttorney.industries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Industries</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.industries.map((ind, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {selectedAttorney.languages && selectedAttorney.languages.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.languages.map((lang, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary visas */}
                {selectedAttorney.primary_visas && selectedAttorney.primary_visas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Primary Visas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.primary_visas.map((visa, i) => (
                        <Badge key={i} className="text-xs font-normal bg-foreground text-background">{visa}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary visas */}
                {selectedAttorney.secondary_visas && selectedAttorney.secondary_visas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Secondary Visas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.secondary_visas.map((visa, i) => (
                        <Badge key={`sv-${i}`} variant="outline" className="text-xs font-normal">{visa}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case strengths */}
                {selectedAttorney.case_strengths && selectedAttorney.case_strengths.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Case Strengths</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.case_strengths.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case capabilities */}
                {selectedAttorney.case_capabilities && selectedAttorney.case_capabilities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Capabilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAttorney.case_capabilities.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notable cases */}
                {selectedAttorney.case_highlights && selectedAttorney.case_highlights.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notable Cases</h3>
                    <ul className="space-y-2">
                      {selectedAttorney.case_highlights.map((highlight: CaseHighlight, i: number) => (
                        <li key={i} className="flex gap-3">
                          <Star className="size-4 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground/80">
                            {highlight.visa_type && `${highlight.visa_type}`}
                            {highlight.industry && ` — ${highlight.industry}`}
                            {highlight.commentary && ` — ${highlight.commentary}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Testimonials */}
                {selectedAttorney.testimonial_excerpts && selectedAttorney.testimonial_excerpts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client Testimonials</h3>
                    <ul className="space-y-3">
                      {selectedAttorney.testimonial_excerpts.map((t, i) => (
                        <li key={i} className="text-sm text-foreground/80 italic border-l-2 border-border pl-4">&ldquo;{t}&rdquo;</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scheduling link */}
                {selectedAttorney.scheduling_link && (
                  <div>
                    <a
                      href={selectedAttorney.scheduling_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#3D2817] hover:underline"
                    >
                      Book a consultation
                    </a>
                  </div>
                )}

              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
