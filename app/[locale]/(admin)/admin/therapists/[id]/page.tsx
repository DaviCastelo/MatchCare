import { getTranslations } from 'next-intl/server'
import { getTherapist, updateTherapist, approveTherapist, rejectTherapist } from '@/app/actions/therapists'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AvailabilityEditor } from '@/components/app/availability-editor'
import { AddressFields } from '@/components/app/address-fields'
import { getStates } from '@/app/actions/locations'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle } from 'lucide-react'

export default async function TherapistDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const therapist = await getTherapist(id)
  const t = await getTranslations('therapists')
  const tc = await getTranslations('common')
  const states = await getStates()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isPending = !therapist.profile?.approved

  async function handleUpdate(formData: FormData) {
    'use server'
    const { locale, id } = await params
    const languages = ((formData.get('languages') as string) || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    await updateTherapist(id, {
      phone: formData.get('phone') as string,
      years_of_experience: Number(formData.get('years_of_experience')),
      professional_score: Number(formData.get('professional_score')),
      sex: formData.get('sex') as 'Male' | 'Female',
      city: formData.get('city') as string,
      street_address: (formData.get('street_address') as string) || null,
      state: (formData.get('state') as string) || 'CA',
      zip_code: ((formData.get('zip_code') as string) || '').trim() || null,
      language: formData.get('language') as string,
      languages: languages.length ? languages : null,
      role: (formData.get('role') as string) || 'BI',
      is_new_hire: formData.get('is_new_hire') === 'on',
      last_score_review_date: formData.get('last_score_review_date') as string || null,
      score_reviewer_supervisor: formData.get('score_reviewer_supervisor') as string || null,
      notes: formData.get('notes') as string || null,
    })
    redirect(`/${locale}/admin/therapists`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {therapist.profile?.full_name ?? therapist.email}
        </h1>
        <Badge variant={isPending ? 'secondary' : 'default'}
          className={isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
          {isPending ? t('pending') : t('approved')}
        </Badge>
      </div>

      {isPending && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="flex items-center gap-4">
            <span className="flex-1 text-amber-800">This therapist is pending approval.</span>
            <form action={async () => {
              'use server'
              await approveTherapist(id, user?.id ?? '')
              redirect(`/${locale}/admin/therapists`)
            }}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1">
                <CheckCircle className="w-3 h-3" />{tc('approve')}
              </Button>
            </form>
            <form action={async () => {
              'use server'
              await rejectTherapist(id, user?.id ?? '')
              redirect(`/${locale}/admin/therapists`)
            }}>
              <Button size="sm" variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" />{tc('reject')}
              </Button>
            </form>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{tc('email')}</Label>
                <Input value={therapist.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')}</Label>
                <Input name="phone" defaultValue={therapist.phone} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('language')}</Label>
                <Input name="language" defaultValue={therapist.language} required />
              </div>
              <AddressFields
                states={states}
                defaultStreet={therapist.street_address}
                defaultCity={therapist.city}
                defaultState={therapist.state}
                defaultZip={therapist.zip_code}
              />
              <div className="space-y-2">
                <Label>{t('experience')}</Label>
                <Input name="years_of_experience" type="number" step="0.5" min={0} defaultValue={therapist.years_of_experience} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('sex')}</Label>
                <Select name="sex" defaultValue={therapist.sex ?? 'Male'} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{tc('male')}</SelectItem>
                    <SelectItem value="Female">{tc('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('professionalScore')} (1-9)</Label>
                <Input name="professional_score" type="number" min={1} max={9} defaultValue={therapist.professional_score} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select name="role" defaultValue={therapist.role ?? 'BI'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCBA">BCBA</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                    <SelectItem value="BI">BI</SelectItem>
                    <SelectItem value="RBT">RBT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Other Languages <span className="text-xs text-gray-400">(comma-separated)</span></Label>
                <Input name="languages" defaultValue={(therapist.languages ?? []).join(', ')} placeholder="Spanish, Mandarin" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="is_new_hire" defaultChecked={therapist.is_new_hire} className="size-4 rounded border-gray-300" />
                New hire (excluded for clients marked “no new BI”)
              </label>
              <div className="space-y-2">
                <Label>{t('lastReview')}</Label>
                <Input name="last_score_review_date" type="date" defaultValue={therapist.last_score_review_date ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>{t('reviewer')}</Label>
                <Input name="score_reviewer_supervisor" defaultValue={therapist.score_reviewer_supervisor ?? ''} placeholder="Supervisor name" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{tc('notes')}</Label>
                <Textarea name="notes" defaultValue={therapist.notes ?? ''} rows={3} />
              </div>
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tc('save')}</Button>
          </form>
        </CardContent>
      </Card>

      <AvailabilityEditor
        entityId={therapist.id}
        entityType="therapist"
        initialSlots={therapist.availability ?? []}
      />
    </div>
  )
}
