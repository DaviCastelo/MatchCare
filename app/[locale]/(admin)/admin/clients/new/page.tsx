import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createClientAction } from '@/app/actions/clients'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddressFields } from '@/components/app/address-fields'
import { getStates } from '@/app/actions/locations'
import { ClinicalProfileFields } from '@/components/app/clinical-profile-fields'
import { parseClinicalFields } from '@/lib/admin/clinical-fields'

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('clients')
  const tc = await getTranslations('common')

  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const states = await getStates()

  async function handleCreate(formData: FormData) {
    'use server'
    const { locale } = await params

    const parentEmail = (formData.get('parent_email') as string)?.trim()
    const parentPassword = formData.get('parent_password') as string
    let parentId: string | null = null

    // Create parent auth account if email provided
    if (parentEmail && parentPassword) {
      const admin = createAdminClient()
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: parentEmail,
        password: parentPassword,
        email_confirm: true,
        user_metadata: {
          full_name: formData.get('parent_full_name') as string || 'Parent',
          role: 'parent',
        },
      })

      if (authError) throw new Error(`Failed to create parent account: ${authError.message}`)
      parentId = authData.user?.id ?? null
    }

    const rawReqSex = formData.get('required_sex') as string
    const rawReqRole = formData.get('required_role') as string

    await createClientAction({
      full_name: formData.get('full_name') as string,
      parent_phone: formData.get('parent_phone') as string,
      behavior_score: Number(formData.get('behavior_score')),
      score_description: formData.get('score_description') as string,
      age: Number(formData.get('age')),
      sex: formData.get('sex') as 'Male' | 'Female',
      language: formData.get('language') as string,
      city: formData.get('city') as string,
      street_address: (formData.get('street_address') as string) || null,
      state: (formData.get('state') as string) || 'CA',
      zip_code: ((formData.get('zip_code') as string) || '').trim() || null,
      school_zip_code: ((formData.get('school_zip_code') as string) || '').trim() || null,
      preferred_session_location: formData.get('preferred_session_location') as 'Clinic' | 'School' | 'Home',
      weekly_hours: Number(formData.get('weekly_hours')),
      health_insurance: (formData.get('health_insurance') as string) || null,
      dob: (formData.get('dob') as string) || null,
      auth_exp_date: (formData.get('auth_exp_date') as string) || null,
      two_to_one_eligible: formData.get('two_to_one_eligible') === 'on',
      assigned_bcba: (formData.get('assigned_bcba') as string) || null,
      assigned_supervisor: (formData.get('assigned_supervisor') as string) || null,
      required_sex: rawReqSex && rawReqSex !== 'none' ? (rawReqSex as 'Male' | 'Female') : null,
      required_language: (formData.get('required_language') as string) || null,
      required_role: rawReqRole && rawReqRole !== 'none' ? rawReqRole : null,
      no_new_therapist: formData.get('no_new_therapist') === 'on',
      ...parseClinicalFields(formData),
      notes: (formData.get('notes') as string) || null,
      parent_id: parentId,
      created_by: user?.id ?? null,
    })

    redirect(`/${locale}/admin/clients`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('new')}</h1>
      <form action={handleCreate} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Child Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{tc('name')}</Label>
                <Input name="full_name" required placeholder="Child's full name" />
              </div>
              <div className="space-y-2">
                <Label>{tc('age')}</Label>
                <Input name="age" type="number" min={1} max={18} required />
              </div>
              <div className="space-y-2">
                <Label>{tc('sex')}</Label>
                <Select name="sex" defaultValue="Male">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{tc('male')}</SelectItem>
                    <SelectItem value="Female">{tc('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('language')}</Label>
                <Input name="language" placeholder="e.g. Portuguese" required />
              </div>
              <AddressFields
                states={states}
                requireZip
                includeSchoolZip
              />
              <div className="space-y-2">
                <Label>{t('parentPhone')}</Label>
                <Input name="parent_phone" required />
              </div>
              <div className="space-y-2">
                <Label>{t('healthInsurance')}</Label>
                <Input name="health_insurance" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>{t('behaviorScore')} (1–9)</Label>
                <Input name="behavior_score" type="number" min={1} max={9} required />
              </div>
              <div className="space-y-2">
                <Label>{t('weeklyHours')}</Label>
                <Input name="weekly_hours" type="number" min={1} max={40} defaultValue={12} required />
              </div>
              <div className="space-y-2">
                <Label>{t('sessionLocation')}</Label>
                <Select name="preferred_session_location" defaultValue="Clinic">
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
                <Textarea name="score_description" rows={3} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{tc('notes')}</Label>
                <Textarea name="notes" rows={2} placeholder="Optional" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Clinical Profile</CardTitle></CardHeader>
          <CardContent>
            <ClinicalProfileFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Clinical &amp; Matching Requirements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input name="dob" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Auth Expiration</Label>
                <Input name="auth_exp_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Assigned BCBA</Label>
                <Input name="assigned_bcba" placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Input name="assigned_supervisor" placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Required therapist sex</Label>
                <Select name="required_sex" defaultValue="none">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No requirement</SelectItem>
                    <SelectItem value="Male">{tc('male')}</SelectItem>
                    <SelectItem value="Female">{tc('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Required role</Label>
                <Select name="required_role" defaultValue="none">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No requirement</SelectItem>
                    <SelectItem value="BCBA">BCBA</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                    <SelectItem value="BI">BI</SelectItem>
                    <SelectItem value="RBT">RBT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Required language</Label>
                <Input name="required_language" placeholder="e.g. Spanish" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pt-7">
                <input type="checkbox" name="two_to_one_eligible" className="size-4 rounded border-gray-300" />
                2:1 eligible
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="no_new_therapist" className="size-4 rounded border-gray-300" />
                No new BI / therapist (exclude new hires)
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parent / Guardian Account</CardTitle>
            <p className="text-sm text-gray-500">Create login credentials so the parent can access the portal and set availability.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Parent Full Name</Label>
                <Input name="parent_full_name" placeholder="Parent's full name" />
              </div>
              <div className="space-y-2">
                <Label>Parent Email</Label>
                <Input name="parent_email" type="email" placeholder="parent@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input name="parent_password" type="password" placeholder="Min. 8 characters" minLength={8} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Leave blank to create the client without a parent portal account.</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700">{tc('save')}</Button>
          <Link href={`/${locale}/admin/clients`}>
            <Button type="button" variant="outline">{tc('cancel')}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
