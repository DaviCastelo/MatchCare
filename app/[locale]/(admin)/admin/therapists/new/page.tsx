import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default async function NewTherapistPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('therapists')
  const tc = await getTranslations('common')

  async function handleCreate(formData: FormData) {
    'use server'
    const { locale } = await params
    const supabase = await createAdminClient()

    // Create auth user
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      user_metadata: {
        full_name: formData.get('full_name') as string,
        role: 'therapist',
      },
      email_confirm: true,
    })

    if (error || !authData.user) throw error

    // Profile is auto-created by trigger; approve immediately since admin is creating
    await supabase.from('profiles').update({ approved: true }).eq('id', authData.user.id)

    await supabase.from('therapists').insert({
      id: authData.user.id,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      years_of_experience: Number(formData.get('years_of_experience')),
      professional_score: Number(formData.get('professional_score')),
      city: formData.get('city') as string,
      language: formData.get('language') as string,
    })

    redirect(`/${locale}/admin/therapists`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('new')}</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Full Name</Label>
                <Input name="full_name" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{tc('email')}</Label>
                <Input name="email" type="email" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Temporary Password</Label>
                <Input name="password" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label>{tc('phone')}</Label>
                <Input name="phone" required />
              </div>
              <div className="space-y-2">
                <Label>{tc('city')}</Label>
                <Input name="city" required />
              </div>
              <div className="space-y-2">
                <Label>{tc('language')}</Label>
                <Input name="language" placeholder="e.g. Portuguese" required />
              </div>
              <div className="space-y-2">
                <Label>{t('experience')}</Label>
                <Input name="years_of_experience" type="number" step="0.5" min={0} defaultValue="0" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('professionalScore')} (1-9)</Label>
                <Input name="professional_score" type="number" min={1} max={9} defaultValue="1" required />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tc('save')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
