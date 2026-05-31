import { getTranslations } from 'next-intl/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { updateClient } from '@/app/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { AvailabilityEditor } from '@/components/app/availability-editor'

export default async function ParentProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('clients')
  const tp = await getTranslations('profile')
  const tc = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = await createAdminClient()
  const { data: client } = await adminClient
    .from('clients')
    .select('*, availability:client_availability(*)')
    .eq('parent_id', user?.id)
    .single()

  if (!client) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tp('title')}</h1>
        <p className="text-gray-500">No child profile found. Please contact your administrator.</p>
      </div>
    )
  }

  async function handleUpdate(formData: FormData) {
    'use server'
    const { locale } = await params
    await updateClient(client!.id, {
      parent_phone: formData.get('parent_phone') as string,
      notes: formData.get('notes') as string || null,
    })
    redirect(`/${locale}/parent/profile`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tp('title')}</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">{client.full_name}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="text-gray-500">{tc('age')}:</span> {client.age}</div>
            <div><span className="text-gray-500">{tc('city')}:</span> {client.city}</div>
            <div><span className="text-gray-500">{tc('language')}:</span> {client.language}</div>
            <div><span className="text-gray-500">{t('sessionLocation')}:</span> {client.preferred_session_location}</div>
          </div>
          <form action={handleUpdate} className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label>{t('parentPhone')}</Label>
              <Input name="parent_phone" defaultValue={client.parent_phone} required />
            </div>
            <div className="space-y-2">
              <Label>{tc('notes')}</Label>
              <Textarea name="notes" defaultValue={client.notes ?? ''} rows={3} />
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tp('saveChanges')}</Button>
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
