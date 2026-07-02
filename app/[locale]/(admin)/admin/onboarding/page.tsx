import { getTranslations } from 'next-intl/server'
import { getClients } from '@/app/actions/clients'
import { ONBOARDING_STAGES } from '@/lib/admin/onboarding'
import { OnboardingBoardCard } from '@/components/app/onboarding-board-card'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const tNav = await getTranslations('nav')
  const clients = await getClients()

  const inPipeline = clients.filter((c) => c.onboarding_stage != null)
  const columns = ONBOARDING_STAGES.map((stage) => ({
    stage,
    items: inPipeline.filter((c) => c.onboarding_stage === stage),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tNav('onboarding')}</h1>
        <span className="text-sm text-muted-foreground">{inPipeline.length} in pipeline</span>
      </div>

      {inPipeline.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-sm text-muted-foreground">
          No clients in the intake pipeline yet. Set a “Pipeline stage” on a client to add them here.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ stage, items }) => (
            <div key={stage} className="w-64 shrink-0 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stage}</h2>
                <span className="text-xs text-muted-foreground rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1 py-4 text-center">—</p>
                ) : (
                  items.map((c) => (
                    <OnboardingBoardCard
                      key={c.id}
                      locale={locale}
                      client={{
                        id: c.id,
                        full_name: c.full_name,
                        onboarding_stage: c.onboarding_stage,
                        projected_start_date: c.projected_start_date,
                        onboarding_owner: c.onboarding_owner,
                        city: c.city,
                        weekly_hours: c.weekly_hours,
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
