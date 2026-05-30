import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { cancelSessionDate } from '@/app/actions/sessions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function CancelSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ sessionId?: string }>
}) {
  const { locale } = await params
  const { sessionId } = await searchParams
  const t = await getTranslations('cancel')
  const tc = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!sessionId) redirect(`/${locale}/parent/schedule`)

  async function handleCancel(formData: FormData) {
    'use server'
    const { locale } = await params
    await cancelSessionDate(
      sessionId!,
      formData.get('date') as string,
      formData.get('reason') as string,
      user?.id ?? ''
    )
    redirect(`/${locale}/parent/schedule`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleCancel} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('selectDate')}</Label>
              <Input
                name="date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('reasonLabel')}</Label>
              <Textarea
                name="reason"
                required
                rows={4}
                placeholder={t('reasonPlaceholder')}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="destructive">{t('submit')}</Button>
              <Link href={`/${locale}/parent/schedule`}>
                <Button type="button" variant="outline">{tc('cancel')}</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
