import { getTranslations } from 'next-intl/server'
import { getAllSessions } from '@/app/actions/sessions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function SessionsPage() {
  const t = await getTranslations('sessions')
  const sessions = await getAllSessions()

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
                <div className="flex flex-col items-center min-w-[48px]">
                  <span className="text-xs font-medium text-teal-600">{DAYS[session.day_of_week]}</span>
                  <span className="text-xs text-gray-500">{session.start_time}–{session.end_time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {(session.client as { full_name: string } | null)?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(session.therapist as { profile?: { full_name: string } } | null)?.profile?.full_name ?? '—'} · {session.location}
                  </p>
                </div>
                <Badge
                  className={
                    session.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : session.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }
                  variant="secondary"
                >
                  {t(session.status)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
