import { getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const supabase = await createAdminClient()

  const [
    { count: totalClients },
    { count: totalTherapists },
    { count: activeSessions },
    { count: pendingApprovals },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('therapists').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('therapist_approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const stats = [
    { label: t('totalClients'), value: totalClients ?? 0, icon: <Users className="w-5 h-5 text-teal-600" />, href: `/${locale}/admin/clients` },
    { label: t('totalTherapists'), value: totalTherapists ?? 0, icon: <UserCheck className="w-5 h-5 text-blue-600" />, href: `/${locale}/admin/therapists` },
    { label: t('activeSessions'), value: activeSessions ?? 0, icon: <Calendar className="w-5 h-5 text-green-600" />, href: `/${locale}/admin/sessions` },
    { label: t('pendingApprovals'), value: pendingApprovals ?? 0, icon: <Clock className="w-5 h-5 text-amber-600" />, href: `/${locale}/admin/therapists?tab=pending` },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        <p className="text-gray-500 mt-1">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(pendingApprovals ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 pt-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              {pendingApprovals} therapist{(pendingApprovals ?? 0) > 1 ? 's' : ''} waiting for approval
            </span>
            <Link href={`/${locale}/admin/therapists?tab=pending`} className="ml-auto">
              <Badge className="bg-amber-600 hover:bg-amber-700 cursor-pointer">Review</Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
