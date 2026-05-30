'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart } from 'lucide-react'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{tc('appName')}</CardTitle>
          <CardDescription className="text-gray-500">{t('login')}</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <form action={formAction} className="space-y-4">
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
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isPending ? tc('loading') : t('login')}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('noAccount')}{' '}
            <Link href="register" className="text-teal-600 hover:underline font-medium">
              {t('register')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
