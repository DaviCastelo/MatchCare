import { getTranslations } from 'next-intl/server'
import { getMySessionsForCalendar } from '@/app/actions/sessions'
import { createClient } from '@/lib/supabase/server'
import { ScheduleCalendarView } from '@/components/sessions/schedule-calendar-view'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default async function ParentSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('sessions')
  const tc = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sessions = await getMySessionsForCalendar()

  const labels = {
    previousMonth: t('previousMonth'),
    nextMonth: t('nextMonth'),
    daySheetTitle: t('daySheetTitle'),
    noSessionsOnDay: t('noSessionsOnDay'),
    selectTime: t('selectTime'),
    cancelled: t('cancelled'),
    client: t('client'),
    therapist: t('therapist'),
    detailTitle: t('detailTitle'),
    therapistInfo: t('therapistInfo'),
    patientInfo: t('patientInfo'),
    sessionInfo: t('sessionInfo'),
    name: tc('name'),
    phone: tc('phone'),
    email: tc('email'),
    city: tc('city'),
    experience: t('experience'),
    age: tc('age'),
    parentPhone: t('parentPhone'),
    location: t('location'),
    time: t('time'),
    notes: t('notes'),
    cancelSession: t('cancelSession'),
    cancelReason: t('cancelReason'),
    cancelReasonPlaceholder: t('cancelReasonPlaceholder'),
    cancelSubmit: t('cancelSubmit'),
    years: t('years'),
    back: t('back'),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mb-4" />
            <p>{t('noSessions')}</p>
          </CardContent>
        </Card>
      ) : (
        <ScheduleCalendarView
          sessions={sessions}
          locale={locale}
          role="parent"
          userId={user?.id}
          labels={labels}
        />
      )}
    </div>
  )
}
