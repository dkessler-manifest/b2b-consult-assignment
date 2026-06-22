'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ManifestLogo } from './manifest-logo'
import { fetchAttorneys } from '@/lib/supabase'
import { updateAttorneyAction } from '@/app/actions/update-attorney'
import { VISA_GROUPS, INDUSTRIES, CASE_STRENGTHS, CASE_CAPABILITIES } from '@/lib/constants'
import type { Attorney, CaseHighlight } from '@/lib/types'
import { Plus, Trash2, Save, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

export function ProfileEditor() {
  const { data: attorneys, error, isLoading } = useSWR('attorneys', fetchAttorneys)

  const [selectedAttorneyId, setSelectedAttorneyId] = useState<string>('')
  const [formData, setFormData] = useState<{
    do_not_send: boolean
    bio: string
    primary_visas: string[]
    secondary_visas: string[]
    industries: string[]
    case_strengths: string[]
    case_capabilities: string[]
    case_highlights: CaseHighlight[]
  }>({
    do_not_send: false,
    bio: '',
    primary_visas: [],
    secondary_visas: [],
    industries: [],
    case_strengths: [],
    case_capabilities: [],
    case_highlights: [],
  })

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const selectedAttorney = attorneys?.find((a) => a.id === selectedAttorneyId)

  useEffect(() => {
    if (selectedAttorney) {
      setFormData({
        do_not_send: selectedAttorney.do_not_send ?? false,
        bio: selectedAttorney.bio ?? '',
        primary_visas: Array.isArray(selectedAttorney.primary_visas) ? selectedAttorney.primary_visas : [],
        secondary_visas: Array.isArray(selectedAttorney.secondary_visas) ? selectedAttorney.secondary_visas : [],
        industries: Array.isArray(selectedAttorney.industries) ? selectedAttorney.industries : [],
        case_strengths: Array.isArray(selectedAttorney.case_strengths) ? selectedAttorney.case_strengths : [],
        case_capabilities: Array.isArray(selectedAttorney.case_capabilities) ? selectedAttorney.case_capabilities : [],
        case_highlights: Array.isArray(selectedAttorney.case_highlights) ? selectedAttorney.case_highlights : [],
      })
    }
  }, [selectedAttorney])

  const handleCheckboxChange = (
    field: 'primary_visas' | 'secondary_visas' | 'industries' | 'case_strengths' | 'case_capabilities',
    value: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter((v) => v !== value),
    }))
  }

  const addSuccessStory = () => {
    setFormData((prev) => ({
      ...prev,
      case_highlights: [
        ...prev.case_highlights,
        { country_of_birth: '', citizenship: '', industry: '', visa_type: '', commentary: '' },
      ],
    }))
  }

  const removeSuccessStory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      case_highlights: prev.case_highlights.filter((_, i) => i !== index),
    }))
  }

  const updateSuccessStory = (index: number, field: keyof CaseHighlight, value: string) => {
    setFormData((prev) => ({
      ...prev,
      case_highlights: prev.case_highlights.map((story, i) =>
        i === index ? { ...story, [field]: value } : story
      ),
    }))
  }

  const handleSave = async () => {
    if (!selectedAttorneyId) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      // Clean up empty success stories
      const cleanedHighlights = formData.case_highlights.filter(
        (story) =>
          story.country_of_birth ||
          story.citizenship ||
          story.industry ||
          story.visa_type ||
          story.commentary
      )

      const result = await updateAttorneyAction(selectedAttorneyId, {
        do_not_send: formData.do_not_send,
        bio: formData.bio,
        primary_visas: formData.primary_visas,
        secondary_visas: formData.secondary_visas,
        industries: formData.industries,
        case_strengths: formData.case_strengths,
        case_capabilities: formData.case_capabilities,
        case_highlights: cleanedHighlights,
      })
      if (!result.success) {
        throw new Error(result.error ?? 'Update failed')
      }

      // Revalidate the attorneys list
      await mutate('attorneys')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('[v0] Failed to save:', err)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load attorneys</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-muted rounded-md transition-colors">
                <ArrowLeft className="size-5" />
              </Link>
              <ManifestLogo className="text-primary" />
              <div>
                <h1 className="font-semibold text-lg leading-tight">Profile Editor</h1>
                <p className="text-xs text-muted-foreground">Manifest Law</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attorney Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Attorney</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAttorneyId} onValueChange={setSelectedAttorneyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an attorney to edit..." />
              </SelectTrigger>
              <SelectContent>
                {attorneys?.map((attorney) => (
                  <SelectItem key={attorney.id} value={attorney.id}>
                    {attorney.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedAttorney && (
          <div className="space-y-8">
            {/* Scheduling Availability */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.do_not_send ? 'unavailable' : 'available'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, do_not_send: value === 'unavailable' }))
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable (Do Not Send)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your professional bio..."
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  className="min-h-32"
                />
              </CardContent>
            </Card>

            {/* Primary Visas */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Visas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(VISA_GROUPS).map(([category, visas]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {visas.map((visa) => {
                        const uid = `primary-${category}-${visa}`
                        return (
                          <div key={uid} className="flex items-center gap-2">
                            <Checkbox
                              id={uid}
                              checked={formData.primary_visas.includes(visa)}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange('primary_visas', visa, checked as boolean)
                              }
                            />
                            <Label htmlFor={uid} className="text-sm font-normal cursor-pointer">
                              {visa}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Secondary Visas */}
            <Card>
              <CardHeader>
                <CardTitle>Secondary Visas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(VISA_GROUPS).map(([category, visas]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {visas.map((visa) => {
                        const uid = `secondary-${category}-${visa}`
                        return (
                          <div key={uid} className="flex items-center gap-2">
                            <Checkbox
                              id={uid}
                              checked={formData.secondary_visas.includes(visa)}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange('secondary_visas', visa, checked as boolean)
                              }
                            />
                            <Label htmlFor={uid} className="text-sm font-normal cursor-pointer">
                              {visa}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Industries */}
            <Card>
              <CardHeader>
                <CardTitle>Industries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {INDUSTRIES.map((industry) => (
                    <div key={industry} className="flex items-center gap-2">
                      <Checkbox
                        id={`industry-${industry}`}
                        checked={formData.industries.includes(industry)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange('industries', industry, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`industry-${industry}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {industry}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Case Strengths */}
            <Card>
              <CardHeader>
                <CardTitle>Case Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {CASE_STRENGTHS.map((strength) => (
                    <div key={strength} className="flex items-center gap-2">
                      <Checkbox
                        id={`strength-${strength}`}
                        checked={formData.case_strengths.includes(strength)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange('case_strengths', strength, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`strength-${strength}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {strength}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Case Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Case Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {CASE_CAPABILITIES.map((capability) => (
                    <div key={capability} className="flex items-center gap-2">
                      <Checkbox
                        id={`capability-${capability}`}
                        checked={formData.case_capabilities.includes(capability)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange('case_capabilities', capability, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`capability-${capability}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {capability}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Success Stories */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Success Stories</CardTitle>
                <Button variant="outline" size="sm" onClick={addSuccessStory}>
                  <Plus className="size-4 mr-1" />
                  Add Story
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.case_highlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No success stories yet. Click &quot;Add Story&quot; to create one.
                  </p>
                ) : (
                  formData.case_highlights.map((story, index) => (
                    <Card key={index} className="bg-muted/50 py-4">
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-muted-foreground">
                            Story #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeSuccessStory(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Country of Birth</Label>
                            <Input
                              placeholder="e.g. India"
                              value={story.country_of_birth || ''}
                              onChange={(e) =>
                                updateSuccessStory(index, 'country_of_birth', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Citizenship</Label>
                            <Input
                              placeholder="e.g. Indian"
                              value={story.citizenship || ''}
                              onChange={(e) =>
                                updateSuccessStory(index, 'citizenship', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Industry</Label>
                            <Input
                              placeholder="e.g. Tech"
                              value={story.industry || ''}
                              onChange={(e) =>
                                updateSuccessStory(index, 'industry', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Visa Type</Label>
                            <Input
                              placeholder="e.g. O-1A"
                              value={story.visa_type || ''}
                              onChange={(e) =>
                                updateSuccessStory(index, 'visa_type', e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Commentary</Label>
                          <Textarea
                            placeholder="Brief description of the case..."
                            value={story.commentary || ''}
                            onChange={(e) =>
                              updateSuccessStory(index, 'commentary', e.target.value)
                            }
                            className="mt-1 min-h-20"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pb-8">
              <Button onClick={handleSave} disabled={saving} className="min-w-32">
                {saving ? (
                  <>
                    <Spinner className="size-4 mr-2" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="size-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
