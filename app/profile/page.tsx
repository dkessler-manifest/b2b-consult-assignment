import { PasscodeGate } from '@/components/passcode-gate'
import { ProfileEditor } from '@/components/profile-editor'

export default function ProfilePage() {
  return (
    <PasscodeGate>
      <ProfileEditor />
    </PasscodeGate>
  )
}
