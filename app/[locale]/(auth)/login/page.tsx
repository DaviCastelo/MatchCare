'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState } from 'react'
import { MatchCareLogo } from '@/components/app/matchcare-logo'
import { login } from '@/app/actions/auth'
import { localeFromPathname } from '@/lib/i18n/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const pathname = usePathname()
  const locale = localeFromPathname(pathname) ?? 'en'
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <Card className="w-full max-w-md shadow-xl ring-foreground/[0.08] backdrop-blur-sm bg-card/90 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-2 px-2">
            <MatchCareLogo className="max-w-[240px]" priority />
          </div>
          <CardTitle className="sr-only">{tc('appName')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('login')}</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-teal-600 hover:bg-teal-700 transition-all duration-200 hover:shadow-lg hover:shadow-teal-600/25 active:scale-[0.99]"
            >
              {isPending ? tc('loading') : t('login')}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('noAccount')}{' '}
            <Link href="register" className="text-teal-600 hover:underline font-medium">
              {t('register')}
            </Link>
          </p>
        </CardContent>
      </Card>
  )
}
