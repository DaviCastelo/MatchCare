import { useTranslations } from 'next-intl'
import { logout } from '@/app/actions/auth'
import { MatchCareLogo } from '@/components/app/matchcare-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
  const t = useTranslations('auth')

  return (
    <Card className="w-full max-w-md text-center shadow-xl ring-foreground/[0.08] backdrop-blur-sm bg-card/90 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <div className="flex justify-center mb-4 px-2">
            <MatchCareLogo className="max-w-[200px]" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
              <Clock className="relative w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-xl text-foreground">{t('pendingTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t('pendingDescription')}</p>
          <form action={logout}>
            <Button variant="outline" type="submit" className="w-full">
              {t('logout')}
            </Button>
          </form>
        </CardContent>
      </Card>
  )
}
