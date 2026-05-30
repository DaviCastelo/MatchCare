import { useTranslations } from 'next-intl'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">{t('pendingTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-500">{t('pendingDescription')}</p>
          <form action={logout}>
            <Button variant="outline" type="submit" className="w-full">
              {t('logout')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
