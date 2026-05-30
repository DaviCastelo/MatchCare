import { getTranslations } from 'next-intl/server'
import { getMyTherapistProfile, updateTherapist, upsertTherapistAvailability } from '@/app/actions/therapists'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { AvailabilityEditor } from '@/components/app/availability-editor'

export default async function TherapistProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('therapists')
  const tp = await getTranslations('profile')
  const tc = await getTranslations('common')

  const profile = await getMyTherapistProfile()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function handleUpdate(formData: FormData) {
    'use server'
    const { locale } = await params
    await updateTherapist(user?.id ?? '', {
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      language: formData.get('language') as string,
      notes: formData.get('notes') as string || null,
    })
    redirect(`/${locale}/therapist/profile`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{tp('title')}</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">{tp('personalInfo')}</CardTitle></CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{tc('email')}</Label>
                <Input value={profile.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')}</Label>
                <Input name="phone" defaultValue={profile.phone} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('city')}</Label>
                <Input name="city" defaultValue={profile.city} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('language')}</Label>
                <Input name="language" defaultValue={profile.language} required />
              </div>
              <div className="space-y-2">
                <Label>{t('experience')}</Label>
                <Input value={profile.years_of_experience} disabled className="bg-gray-50" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{tc('notes')}</Label>
                <Textarea name="notes" defaultValue={profile.notes ?? ''} rows={3} />
              </div>
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tp('saveChanges')}</Button>
          </form>
        </CardContent>
      </Card>

      <AvailabilityEditor
        entityId={profile.id}
        entityType="therapist"
        initialSlots={profile.availability ?? []}
      />
    </div>
  )
}
