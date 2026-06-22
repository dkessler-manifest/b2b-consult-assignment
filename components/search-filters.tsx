'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { VISA_CATEGORIES, VISA_GROUPS, CASE_STRENGTHS, INDUSTRIES, CASE_CAPABILITIES } from '@/lib/constants'

const STATUS_COLORS = [
  { value: 'green', label: 'Green', className: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-400' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'red', label: 'Red', className: 'bg-red-500' },
]

interface SearchFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  selectedVisaCategory: string | null
  onVisaCategoryChange: (category: string | null) => void
  selectedVisa: string | null
  onVisaChange: (visa: string | null) => void
  selectedCaseStrength: string | null
  onCaseStrengthChange: (strength: string | null) => void
  selectedIndustry: string | null
  onIndustryChange: (industry: string | null) => void
  selectedAvailability: 'available' | 'unavailable' | null
  onAvailabilityChange: (availability: 'available' | 'unavailable' | null) => void
  selectedStatusColor: string | null
  onStatusColorChange: (color: string | null) => void
  selectedCaseCapability: string | null
  onCaseCapabilityChange: (cap: string | null) => void
  selectedLanguage: string | null
  onLanguageChange: (lang: string | null) => void
  availableLanguages: string[]
}

export function SearchFilters({
  search,
  onSearchChange,
  selectedVisaCategory,
  onVisaCategoryChange,
  selectedVisa,
  onVisaChange,
  selectedCaseStrength,
  onCaseStrengthChange,
  selectedIndustry,
  onIndustryChange,
  selectedAvailability,
  onAvailabilityChange,
  selectedStatusColor,
  onStatusColorChange,
  selectedCaseCapability,
  onCaseCapabilityChange,
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
}: SearchFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const clearAllFilters = () => {
    onSearchChange('')
    onVisaCategoryChange(null)
    onVisaChange(null)
    onCaseStrengthChange(null)
    onIndustryChange(null)
    onAvailabilityChange(null)
    onStatusColorChange(null)
    onCaseCapabilityChange(null)
    onLanguageChange(null)
  }

  const activeFilterCount = [
    selectedVisaCategory,
    selectedVisa,
    selectedCaseStrength,
    selectedIndustry,
    selectedAvailability,
    selectedStatusColor,
    selectedCaseCapability,
    selectedLanguage,
  ].filter(Boolean).length

  const hasActiveFilters = !!(search || activeFilterCount)

  return (
    <div className="space-y-4">
      {/* Search bar + filter toggle row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, visa type, industry, or strength..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-12 bg-white border-0 shadow-sm text-base"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 h-12 px-5 bg-[#3D2817] text-white shadow-sm border-0 text-sm font-medium hover:bg-[#2D1C10] transition-colors"
        >
          <SlidersHorizontal className="size-4 shrink-0" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center size-5 rounded-full bg-white text-[#3D2817] text-xs font-semibold leading-none">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`size-3.5 shrink-0 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Collapsible filter panels */}
      {filtersOpen && (
        <div className="bg-white shadow-sm p-6 space-y-5">
          {/* Status Color */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Status Color</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_COLORS.map(({ value, label, className }) => (
                <button
                  key={value}
                  onClick={() => onStatusColorChange(selectedStatusColor === value ? null : value)}
                  className={`flex items-center gap-2 h-8 px-4 rounded-full border text-xs font-normal transition-all ${
                    selectedStatusColor === value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-white text-foreground hover:border-foreground/40'
                  }`}
                >
                  <span className={`size-2.5 rounded-full shrink-0 ${className}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Availability</p>
            <div className="flex flex-wrap gap-2">
              {(['available', 'unavailable'] as const).map((avail) => (
                <Button
                  key={avail}
                  variant={selectedAvailability === avail ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAvailabilityChange(selectedAvailability === avail ? null : avail)}
                  className="rounded-full text-xs font-normal h-8 px-4 capitalize"
                >
                  {avail}
                </Button>
              ))}
            </div>
          </div>

          {/* Visa Category */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Visa Category</p>
            <div className="flex flex-wrap gap-2">
              {VISA_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedVisaCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onVisaCategoryChange(selectedVisaCategory === category ? null : category)}
                  className="rounded-full text-xs font-normal h-8 px-4"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Visa Type — grouped by category */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Visa Type</p>
            <div className="space-y-3">
              {VISA_CATEGORIES.map((category) => (
                <div key={category}>
                  <p className="text-xs text-muted-foreground mb-1.5">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VISA_GROUPS[category].map((visa) => (
                      <button
                        key={visa}
                        onClick={() => onVisaChange(selectedVisa === visa ? null : visa)}
                        className={`h-7 px-3 text-xs rounded-full border transition-all ${
                          selectedVisa === visa
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-white text-foreground border-border hover:border-foreground/40'
                        }`}
                      >
                        {visa}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Industry</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <Button
                  key={industry}
                  variant={selectedIndustry === industry ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onIndustryChange(selectedIndustry === industry ? null : industry)}
                  className="rounded-full text-xs font-normal h-8 px-4"
                >
                  {industry}
                </Button>
              ))}
            </div>
          </div>

          {/* Case Strength */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Case Strength</p>
            <div className="flex flex-wrap gap-2">
              {CASE_STRENGTHS.map((strength) => (
                <Button
                  key={strength}
                  variant={selectedCaseStrength === strength ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onCaseStrengthChange(selectedCaseStrength === strength ? null : strength)}
                  className="rounded-full text-xs font-normal h-8 px-4"
                >
                  {strength}
                </Button>
              ))}
            </div>
          </div>

          {/* Case Capabilities */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Case Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {CASE_CAPABILITIES.map((cap) => (
                <Button
                  key={cap}
                  variant={selectedCaseCapability === cap ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onCaseCapabilityChange(selectedCaseCapability === cap ? null : cap)}
                  className="rounded-full text-xs font-normal h-8 px-4"
                >
                  {cap}
                </Button>
              ))}
            </div>
          </div>

          {/* Language */}
          {availableLanguages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Language</p>
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map((lang) => (
                  <Button
                    key={lang}
                    variant={selectedLanguage === lang ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onLanguageChange(selectedLanguage === lang ? null : lang)}
                    className="rounded-full text-xs font-normal h-8 px-4"
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Clear All */}
          {hasActiveFilters && (
            <div className="pt-1 border-t border-border">
              <button
                onClick={clearAllFilters}
                className="text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active filter summary chips (when filters are collapsed) */}
      {!filtersOpen && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {selectedStatusColor && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full capitalize">
              {selectedStatusColor}
              <button onClick={() => onStatusColorChange(null)} aria-label="Remove color filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedAvailability && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full capitalize">
              {selectedAvailability}
              <button onClick={() => onAvailabilityChange(null)} aria-label="Remove availability filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedVisaCategory && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedVisaCategory}
              <button onClick={() => onVisaCategoryChange(null)} aria-label="Remove visa category filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedVisa && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedVisa}
              <button onClick={() => onVisaChange(null)} aria-label="Remove visa type filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedIndustry && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedIndustry}
              <button onClick={() => onIndustryChange(null)} aria-label="Remove industry filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedCaseStrength && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedCaseStrength}
              <button onClick={() => onCaseStrengthChange(null)} aria-label="Remove strength filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedCaseCapability && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedCaseCapability}
              <button onClick={() => onCaseCapabilityChange(null)} aria-label="Remove capability filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          {selectedLanguage && (
            <span className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1 rounded-full">
              {selectedLanguage}
              <button onClick={() => onLanguageChange(null)} aria-label="Remove language filter">
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-foreground/50 hover:text-foreground transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
