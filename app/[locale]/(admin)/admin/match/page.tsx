import { getTranslations } from 'next-intl/server'
import { getClients } from '@/app/actions/clients'
import { MatchTool } from './match-tool'

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('match')
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
      <MatchTool clients={clients} locale={locale} />
    </div>
  )
}
