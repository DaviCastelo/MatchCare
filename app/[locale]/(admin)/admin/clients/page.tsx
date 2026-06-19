import { getTranslations } from 'next-intl/server'
import { getClients } from '@/app/actions/clients'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, User } from 'lucide-react'

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const clients = await getClients()

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

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User className="w-12 h-12 mb-4" />
            <p>{t('noClients')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Link key={client.id} href={`/${locale}/admin/clients/${client.id}`}>
              <Card className="hover:shadow-md hover:ring-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <Avatar size="lg" className="size-11">
                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold text-sm">
                      {client.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{client.full_name}</p>
                    <p className="text-sm text-muted-foreground">{client.city} · {client.age}y · {client.language}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Score {client.behavior_score}
                    </Badge>
                    <Badge
                      className={
                        client.preferred_session_location === 'Clinic'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : client.preferred_session_location === 'Home'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                      }
                      variant="secondary"
                    >
                      {client.preferred_session_location}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
