import { getTranslations } from 'next-intl/server'
import { getMySessions } from '@/app/actions/sessions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function ParentSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('sessions')
  const sessions = await getMySessions()

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
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex flex-col items-center min-w-[72px]">
                  <span className="text-sm font-semibold text-teal-600">{DAYS[session.day_of_week]}</span>
                  <span className="text-xs text-gray-500">{session.start_time}–{session.end_time}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {(session.therapist as { profile?: { full_name: string } } | null)?.profile?.full_name ?? 'Therapist'}
                  </p>
                  <p className="text-sm text-gray-500">{session.location}</p>
                </div>
                <Link href={`/${locale}/parent/cancel?sessionId=${session.id}`}>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
