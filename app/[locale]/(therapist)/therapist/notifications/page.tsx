import { getMyNotifications, markAllNotificationsRead } from '@/app/actions/notifications'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'

export default async function TherapistNotificationsPage() {
  const t = await getTranslations('notifications')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const notifications = await getMyNotifications()
  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        {unread.length > 0 && (
          <form action={async () => {
            'use server'
            await markAllNotificationsRead(user?.id ?? '')
          }}>
            <Button size="sm" variant="outline" className="gap-2">
              <CheckCheck className="w-4 h-4" />
              {t('markAllRead')}
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mb-4" />
            <p>{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? 'border-teal-200 bg-teal-50/50' : ''}>
              <CardContent className="flex items-start gap-3 py-4">
                {!n.read && <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{t(n.type as 'session_cancelled')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(n.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                {!n.read && <Badge className="bg-teal-100 text-teal-700 text-xs" variant="secondary">New</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
