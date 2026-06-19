import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getClients } from '@/app/actions/clients'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ClientsAdminList } from '@/components/admin/clients-admin-list'

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const clients = await getClients()

  const labels = {
    noClients: t('noClients'),
    behaviorScore: t('behaviorScore'),
    sessionLocation: t('sessionLocation'),
    clinic: t('clinic'),
    school: t('school'),
    home: t('home'),
    weeklyHours: t('weeklyHours'),
    healthInsurance: t('healthInsurance'),
    searchPlaceholder: t('searchPlaceholder'),
    clearFilters: t('clearFilters'),
    noResults: t('noResults'),
    sex: tc('sex'),
    city: tc('city'),
    language: tc('language'),
    all: tc('all'),
    male: tc('male'),
    female: tc('female'),
    filter: tc('filter'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        <Link href={`/${locale}/admin/clients/new`}>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus className="w-4 h-4" />
            {t('new')}
          </Button>
        </Link>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">{tc('loading')}</p>}>
        <ClientsAdminList clients={clients} locale={locale} labels={labels} />
      </Suspense>
    </div>
  )
}
