import { getTranslations } from 'next-intl/server'
import { getAllSessions, createChangeRequest } from '@/app/actions/sessions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function ScheduleChangePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('scheduleChange')
  const tc = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sessions = await getAllSessions()
  const activeSessions = sessions.filter((s) => s.status === 'active')

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const REASONS = [
    'parent_complaint', 'therapist_resignation', 'new_client', 'availability_change',
  ] as const

  async function handleSubmit(formData: FormData) {
    'use server'
    const { locale } = await params
    await createChangeRequest(
      formData.get('session_id') as string,
      formData.get('reason') as string,
      formData.get('notes') as string,
      user?.id ?? ''
    )
    redirect(`/${locale}/admin/sessions`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('selectSession')}</Label>
              <Select name="session_id" required>
                <SelectTrigger><SelectValue placeholder="Select a session" /></SelectTrigger>
                <SelectContent>
                  {activeSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {(s.client as { full_name: string } | null)?.full_name} — {DAYS[s.day_of_week]} {s.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('selectReason')}</Label>
              <Select name="reason" required>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{t(`reason_${r}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('notes')}</Label>
              <Textarea name="notes" rows={3} placeholder="Additional details..." />
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{t('submit')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
