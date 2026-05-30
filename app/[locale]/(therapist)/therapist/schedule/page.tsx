import { getTranslations } from 'next-intl/server'
import { getMySessions } from '@/app/actions/sessions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Info } from 'lucide-react'
import Link from 'next/link'
import { getMyTherapistProfile } from '@/app/actions/therapists'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function TherapistSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('sessions')
  const tt = await getTranslations('therapists')

  const [sessions, profile] = await Promise.all([
    getMySessions(),
    getMyTherapistProfile(),
  ])

  const hasNoAvailability = !profile.availability || profile.availability.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      {hasNoAvailability && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {tt('availabilityEmpty')}{' '}
            <Link href={`/${locale}/therapist/profile`} className="font-medium underline">Update profile</Link>
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
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex flex-col items-center min-w-[64px]">
                  <span className="text-sm font-semibold text-teal-600">{DAYS[session.day_of_week]}</span>
                  <span className="text-xs text-gray-500">{session.start_time}–{session.end_time}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {(session.client as { full_name: string } | null)?.full_name}
                  </p>
                  <p className="text-sm text-gray-500">{session.location}</p>
                </div>
                <Badge className="bg-green-100 text-green-700" variant="secondary">Active</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
