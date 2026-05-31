import Image from 'next/image'
import { cn } from '@/lib/utils'

type MatchCareLogoProps = {
  className?: string
  priority?: boolean
}

export function MatchCareLogo({ className, priority = true }: MatchCareLogoProps) {
  return (
    <Image
      src="/Logo.webp"
      alt="MatchCare"
      width={320}
      height={128}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      className={cn('h-auto w-full object-contain', className)}
    />
  )
}
