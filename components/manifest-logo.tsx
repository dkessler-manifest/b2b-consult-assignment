import { cn } from '@/lib/utils'

interface ManifestLogoProps {
  className?: string
}

export function ManifestLogo({ className }: ManifestLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-10', className)}
    >
      {/* Stacked layers representing building blocks / foundation */}
      <rect x="4" y="26" width="32" height="6" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="6" y="18" width="28" height="6" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="8" y="10" width="24" height="6" rx="1" fill="currentColor" />
    </svg>
  )
}
