'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ManifestLogo } from './manifest-logo'
import { Lock } from 'lucide-react'

const CORRECT_PASSCODE = 'manifest2025'

interface PasscodeGateProps {
  children: React.ReactNode
}

export function PasscodeGate({ children }: PasscodeGateProps) {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('profileUnlocked') === 'true'
    }
    return false
  })
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passcode === CORRECT_PASSCODE) {
      sessionStorage.setItem('profileUnlocked', 'true')
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect passcode')
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-white">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-6">
            <ManifestLogo className="text-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">Profile Editor</CardTitle>
          <CardDescription className="text-sm mt-2">Enter the passcode to access your profile</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value)
                  setError('')
                }}
                className="h-12 text-center border-border bg-white"
              />
              {error && <p className="text-destructive text-xs mt-3 text-center">{error}</p>}
            </div>
            <Button type="submit" className="w-full h-11 text-base">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
