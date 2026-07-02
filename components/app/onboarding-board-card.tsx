'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateOnboardingStage } from '@/app/actions/clients'
import { ONBOARDING_STAGES } from '@/lib/admin/onboarding'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export type OnboardingCardClient = {
  id: string
  full_name: string
  onboarding_stage: string | null
  projected_start_date: string | null
  onboarding_owner: string | null
  city: string
  weekly_hours: number
}

export function OnboardingBoardCard({
  client,
  locale,
}: {
  client: OnboardingCardClient
  locale: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function move(value: string | null) {
    const next = value && value !== 'none' ? value : null
    if (next === client.onboarding_stage) return
    startTransition(async () => {
      try {
        await updateOnboardingStage(client.id, next)
        router.refresh()
      } catch {
        toast.error('Could not update stage')
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-2 shadow-sm">
      <Link
        href={`/${locale}/admin/clients/${client.id}`}
        className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400"
      >
        {client.full_name}
      </Link>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>{client.city} · {client.weekly_hours}h/wk</p>
        {client.projected_start_date && <p>Projected start: {client.projected_start_date}</p>}
        {client.onboarding_owner && <p>Owner: {client.onboarding_owner}</p>}
      </div>
      <Select
        value={client.onboarding_stage ?? 'none'}
        onValueChange={move}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ONBOARDING_STAGES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectItem value="none">Remove from pipeline</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
