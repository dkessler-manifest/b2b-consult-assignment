'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchAttorneyById } from '@/lib/supabase'
import { updateAttorneyAction } from '@/app/actions/update-attorney'
import type { Attorney } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Loader2, X, Plus } from 'lucide-react'

// Editable text field
function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-none border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#3D2817]/30 resize-none"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-none border-border bg-white focus-visible:ring-[#3D2817]/30"
        />
      )}
    </div>
  )
}

// Editable tag/badge field — each item renders as a removable block
function TagField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  const remove = (item: string) => onChange(value.filter((v) => v !== item))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {/* Existing tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-normal bg-foreground/5 border border-border text-foreground rounded-none"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Remove ${item}`}
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Add input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={add}
          placeholder={placeholder ?? 'Type and press Enter to add...'}
          className="rounded-none border-border bg-white focus-visible:ring-[#3D2817]/30 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="rounded-none border-border shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// Scheduling links editor — label → URL pairs
function SchedulingLinksEditor({
  value,
  onChange,
}: {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const add = () => {
    const label = newLabel.trim()
    const url = newUrl.trim()
    if (!label || !url) return
    onChange({ ...value, [label]: url })
    setNewLabel('')
    setNewUrl('')
  }

  const remove = (key: string) => {
    const updated = { ...value }
    delete updated[key]
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling Links</label>
      {Object.keys(value).length > 0 && (
        <div className="space-y-2">
          {Object.entries(value).map(([label, url]) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="font-medium min-w-20 capitalize">{label}:</span>
              <span className="text-muted-foreground truncate flex-1">{url}</span>
              <button
                type="button"
                onClick={() => remove(label)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (e.g. free, 99, 349)"
          className="rounded-none border-border bg-white focus-visible:ring-[#3D2817]/30 text-sm w-32"
        />
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="https://manifestlaw.cal.com/..."
          className="rounded-none border-border bg-white focus-visible:ring-[#3D2817]/30 text-sm flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="rounded-none border-border shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function ToggleField({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#3D2817]/30 ${
          value ? 'bg-red-500' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#3D2817] border-b border-[#3D2817]/20 pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function ProfileEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [attorney, setAttorney] = useState<Attorney | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')

  // Local form state — mirrors Attorney fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [doNotSend, setDoNotSend] = useState(false)
  const [doNotSendReason, setDoNotSendReason] = useState('')
  const [primaryVisas, setPrimaryVisas] = useState<string[]>([])
  const [secondaryVisas, setSecondaryVisas] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [caseStrengths, setCaseStrengths] = useState<string[]>([])
  const [caseCapabilities, setCaseCapabilities] = useState<string[]>([])
  const [schedulingLinks, setSchedulingLinks] = useState<Record<string, string>>({})
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [googleSummary, setGoogleSummary] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchAttorneyById(id)
      .then((data) => {
        if (!data) { setError('Attorney not found.'); return }
        setAttorney(data)
        setName(data.name ?? '')
        setEmail(data.email ?? '')
        setBio(data.bio ?? '')
        setEmploymentType(data.employment_type ?? '')
        setDoNotSend(data.do_not_send)
        setDoNotSendReason(data.do_not_send_reason ?? '')
        setPrimaryVisas(data.primary_visas ?? [])
        setSecondaryVisas(data.secondary_visas ?? [])
        setIndustries(data.industries ?? [])
        setLanguages(data.languages ?? [])
        setCaseStrengths(data.case_strengths ?? [])
        setCaseCapabilities(data.case_capabilities ?? [])
        setSchedulingLinks(data.scheduling_links ?? {})
        setYearsOfExperience(data.years_of_experience ?? '')
        setGoogleSummary(data.google_summary ?? '')
      })
      .catch(() => setError('Failed to load attorney.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!attorney) return
    setSaving(true)
    setSavedMsg('')
    setError('')
    if (!email.trim()) {
      setError('Email is required')
      setSaving(false)
      return
    }
    try {
      const result = await updateAttorneyAction(attorney.id, {
        name,
        email: email || null,
        bio: bio || null,
        employment_type: employmentType || null,
        do_not_send: doNotSend,
        do_not_send_reason: doNotSendReason || null,
        primary_visas: primaryVisas,
        secondary_visas: secondaryVisas,
        industries,
        languages,
        case_strengths: caseStrengths,
        case_capabilities: caseCapabilities,
        scheduling_links: schedulingLinks,
        years_of_experience: yearsOfExperience || null,
        google_summary: googleSummary || null,
      })
      if (!result.success) {
        setError(result.error ?? 'Failed to save. Please try again.')
        return
      }
      setSavedMsg('Saved successfully.')
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-[#3D2817]" />
      </div>
    )
  }

  if (error && !attorney) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-red-600 text-sm">{error}</p>
        <Link href="/">
          <Button variant="outline" className="rounded-none">Back to Directory</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-[#3D2817]/20 bg-gradient-to-r from-white to-[#3D2817]/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-xl font-serif font-bold text-foreground leading-tight">{name || 'Profile Editor'}</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Editing Attorney Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedMsg && <span className="text-xs text-green-600">{savedMsg}</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3D2817] hover:bg-[#2D1C10] text-white rounded-none"
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">

        <Section title="Basic Information">
          <Field label="Full Name" value={name} onChange={setName} placeholder="Attorney name" required />
          <Field label="Email" value={email} onChange={setEmail} placeholder="attorney@manifestlaw.com" required />
          <Field label="Bio" value={bio} onChange={setBio} placeholder="Short biography..." multiline />
          <Field label="Employment Type" value={employmentType} onChange={setEmploymentType} placeholder="e.g. W2, 1099, PT CC" />
          <Field label="Years of Experience" value={yearsOfExperience} onChange={setYearsOfExperience} placeholder="e.g. 10 years 6 months" />
        </Section>

        <Section title="Scheduling">
          <SchedulingLinksEditor value={schedulingLinks} onChange={setSchedulingLinks} />
        </Section>

        <Section title="Availability">
          <ToggleField
            label="Do Not Send"
            value={doNotSend}
            onChange={setDoNotSend}
            description="When enabled, this attorney will be flagged as unavailable (red)"
          />
          <Field
            label="Do Not Send Reason"
            value={doNotSendReason}
            onChange={setDoNotSendReason}
            placeholder="e.g. DO NOT SEND — on leave until May 2026"
            multiline
          />
        </Section>

        <Section title="Practice Areas">
          <TagField label="Primary Visas" value={primaryVisas} onChange={setPrimaryVisas} placeholder="Add visa type (e.g. EB-1A)..." />
          <TagField label="Secondary Visas" value={secondaryVisas} onChange={setSecondaryVisas} placeholder="Add visa type (e.g. H-1B)..." />
          <TagField label="Case Strengths" value={caseStrengths} onChange={setCaseStrengths} placeholder="Add case strength..." />
          <TagField label="Case Capabilities" value={caseCapabilities} onChange={setCaseCapabilities} placeholder="Add capability..." />
        </Section>

        <Section title="Background">
          <TagField label="Industries" value={industries} onChange={setIndustries} placeholder="Add industry (e.g. Tech)..." />
          <TagField label="Languages" value={languages} onChange={setLanguages} placeholder="Add language (e.g. Spanish)..." />
        </Section>

        <Section title="Profile Summary">
          <Field label="Google Summary" value={googleSummary} onChange={setGoogleSummary} placeholder="AI-generated profile summary..." multiline />
        </Section>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#3D2817] hover:bg-[#2D1C10] text-white rounded-none px-8"
          >
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  )
}
