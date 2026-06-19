import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getTherapists } from '@/app/actions/therapists'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TherapistsAdminList } from '@/components/admin/therapists-admin-list'

export default async function TherapistsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('therapists')
  const tc = await getTranslations('common')
  const therapists = await getTherapists()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const labels = {
    approved: t('approved'),
    pending: t('pending'),
    noTherapists: t('noTherapists'),
    noPending: t('noPending'),
    noResults: t('noResults'),
    searchPlaceholder: t('searchPlaceholder'),
    clearFilters: t('clearFilters'),
    sex: tc('sex'),
    city: tc('city'),
    language: tc('language'),
    all: tc('all'),
    male: tc('male'),
    female: tc('female'),
    sexNotSet: t('sexNotSet'),
    filter: tc('filter'),
    approve: tc('approve'),
    reject: tc('reject'),
    experience: t('experience'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        <Link href={`/${locale}/admin/therapists/new`}>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus className="w-4 h-4" />{t('new')}
          </Button>
        </Link>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">{tc('loading')}</p>}>
        <TherapistsAdminList
          therapists={therapists}
          locale={locale}
          adminUserId={user?.id ?? ''}
          labels={labels}
        />
      </Suspense>
    </div>
  )
}
