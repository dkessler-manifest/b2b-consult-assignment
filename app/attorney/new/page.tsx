'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAttorneyAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Loader2, X, Plus, UserPlus } from 'lucide-react'

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

// Editable tag/badge field
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

// Section wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

// Scheduling link editor
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
          placeholder="Label (e.g. free)"
          className="rounded-none border-border bg-white focus-visible:ring-[#3D2817]/30 text-sm w-32"
        />
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="URL (e.g. https://manifestlaw.cal.com/...)"
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

export default function NewAttorneyPage() {
  const router = useRouter()

  // Form state
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
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [googleSummary, setGoogleSummary] = useState('')
  const [schedulingLinks, setSchedulingLinks] = useState<Record<string, string>>({})

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const newId = await createAttorneyAction({
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
        years_of_experience: yearsOfExperience || null,
        google_summary: googleSummary || null,
        scheduling_links: schedulingLinks,
      })
      router.push(`/profile/${newId}`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setError(errMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-[#3D2817]/20 bg-gradient-to-r from-white to-[#3D2817]/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-foreground hover:text-foreground/70 transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex items-center gap-3">
              <UserPlus className="size-5 text-[#3D2817]" />
              <h1 className="text-xl font-serif font-bold text-foreground">Add New Attorney</h1>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !email.trim()}
            className="bg-[#3D2817] hover:bg-[#2D1C10] text-white rounded-none"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Create Attorney
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Section title="Basic Information">
          <Field label="Name" value={name} onChange={setName} placeholder="Full name" required />
          <Field label="Email" value={email} onChange={setEmail} placeholder="attorney@manifestlaw.com" required />
          <Field label="Bio" value={bio} onChange={setBio} placeholder="Brief biography..." multiline />
          <Field label="Employment Type" value={employmentType} onChange={setEmploymentType} placeholder="e.g. PT CC, W2, 1099" />
          <Field label="Years of Experience" value={yearsOfExperience} onChange={setYearsOfExperience} placeholder="e.g. 10 years" />
        </Section>

        <Section title="Availability">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Do Not Send</p>
              <p className="text-xs text-muted-foreground">Mark this attorney as unavailable for new cases</p>
            </div>
            <Switch checked={doNotSend} onCheckedChange={setDoNotSend} />
          </div>
          {doNotSend && (
            <Field
              label="Do Not Send Reason"
              value={doNotSendReason}
              onChange={setDoNotSendReason}
              placeholder="Reason for unavailability..."
              multiline
            />
          )}
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

        <Section title="Scheduling">
          <SchedulingLinksEditor value={schedulingLinks} onChange={setSchedulingLinks} />
        </Section>

        <Section title="Google Summary">
          <Field
            label="Summary"
            value={googleSummary}
            onChange={setGoogleSummary}
            placeholder="Summary text for Google/SEO..."
            multiline
          />
        </Section>
      </div>
    </main>
  )
}
