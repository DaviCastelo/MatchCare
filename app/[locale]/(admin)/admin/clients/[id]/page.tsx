import { getTranslations } from 'next-intl/server'
import { getClient, updateClient } from '@/app/actions/clients'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AvailabilityEditor } from '@/components/app/availability-editor'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const client = await getClient(id)
  const t = await getTranslations('clients')
  const tc = await getTranslations('common')

  async function handleUpdate(formData: FormData) {
    'use server'
    const { locale, id } = await params
    await updateClient(id, {
      full_name: formData.get('full_name') as string,
      parent_phone: formData.get('parent_phone') as string,
      behavior_score: Number(formData.get('behavior_score')),
      score_description: formData.get('score_description') as string,
      age: Number(formData.get('age')),
      sex: formData.get('sex') as 'Male' | 'Female',
      language: formData.get('language') as string,
      city: formData.get('city') as string,
      preferred_session_location: formData.get('preferred_session_location') as 'Clinic' | 'School' | 'Home',
      health_insurance: formData.get('health_insurance') as string || null,
      notes: formData.get('notes') as string || null,
    })
    redirect(`/${locale}/admin/clients`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.full_name}</h1>
        <Badge variant="outline">Score {client.behavior_score}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Child Information</CardTitle></CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{tc('name')}</Label>
                <Input name="full_name" defaultValue={client.full_name} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('age')}</Label>
                <Input name="age" type="number" defaultValue={client.age} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('sex')}</Label>
                <Select name="sex" defaultValue={client.sex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{tc('male')}</SelectItem>
                    <SelectItem value="Female">{tc('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('city')}</Label>
                <Input name="city" defaultValue={client.city} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('language')}</Label>
                <Input name="language" defaultValue={client.language} required />
              </div>
              <div className="space-y-2">
                <Label>{t('parentPhone')}</Label>
                <Input name="parent_phone" defaultValue={client.parent_phone} required />
              </div>
              <div className="space-y-2">
                <Label>{t('healthInsurance')}</Label>
                <Input name="health_insurance" defaultValue={client.health_insurance ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>{t('behaviorScore')} (1–9)</Label>
                <Input name="behavior_score" type="number" min={1} max={9} defaultValue={client.behavior_score} required />
              </div>
              <div className="space-y-2">
                <Label>{t('sessionLocation')}</Label>
                <Select name="preferred_session_location" defaultValue={client.preferred_session_location}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clinic">{t('clinic')}</SelectItem>
                    <SelectItem value="School">{t('school')}</SelectItem>
                    <SelectItem value="Home">{t('home')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('scoreDescription')}</Label>
                <Textarea name="score_description" defaultValue={client.score_description} rows={3} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{tc('notes')}</Label>
                <Textarea name="notes" defaultValue={client.notes ?? ''} rows={2} />
              </div>
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tc('save')}</Button>
          </form>
        </CardContent>
      </Card>

      <AvailabilityEditor
        entityId={client.id}
        entityType="client"
        initialSlots={client.availability ?? []}
      />
    </div>
  )
}
