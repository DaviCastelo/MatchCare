import { getTranslations } from 'next-intl/server'
import { getMySessionsForCalendar } from '@/app/actions/sessions'
import { getMyTherapistProfile } from '@/app/actions/therapists'
import { ScheduleCalendarView } from '@/components/sessions/schedule-calendar-view'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Info } from 'lucide-react'
import Link from 'next/link'

export default async function TherapistSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('sessions')
  const tt = await getTranslations('therapists')
  const tc = await getTranslations('common')

  const [sessions, profile] = await Promise.all([
    getMySessionsForCalendar(),
    getMyTherapistProfile(),
  ])

  const hasNoAvailability = !profile.availability || profile.availability.length === 0

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

      {hasNoAvailability && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {tt('availabilityEmpty')}{' '}
            <Link href={`/${locale}/therapist/profile`} className="font-medium underline">
              Update profile
            </Link>
          </AlertDescription>
        </Alert>
      )}

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
          role="therapist"
          labels={labels}
        />
      )}
    </div>
  )
}
