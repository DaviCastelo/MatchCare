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
import { AddressFields } from '@/components/app/address-fields'
import { getStates } from '@/app/actions/locations'
import { ClinicalProfileFields } from '@/components/app/clinical-profile-fields'
import { parseClinicalFields } from '@/lib/admin/clinical-fields'
import { OnboardingFields } from '@/components/app/onboarding-fields'
import { parseOnboardingFields } from '@/lib/admin/onboarding'
import { getParentTrainingLog, getEligibilityChecks } from '@/app/actions/client-logs'
import { ParentTrainingLog } from '@/components/app/parent-training-log'
import { EligibilityLog } from '@/components/app/eligibility-log'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const client = await getClient(id)
  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const states = await getStates()
  const trainingLog = await getParentTrainingLog(id)
  const eligibilityChecks = await getEligibilityChecks(id)

  async function handleUpdate(formData: FormData) {
    'use server'
    const { locale, id } = await params
    const rawReqSex = formData.get('required_sex') as string
    const rawReqRole = formData.get('required_role') as string
    await updateClient(id, {
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
      health_insurance: formData.get('health_insurance') as string || null,
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
      ...parseOnboardingFields(formData),
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
                <Label>{tc('language')}</Label>
                <Input name="language" defaultValue={client.language} required />
              </div>
              <AddressFields
                states={states}
                defaultStreet={client.street_address}
                defaultCity={client.city}
                defaultState={client.state}
                defaultZip={client.zip_code}
                defaultSchoolZip={client.school_zip_code}
                includeSchoolZip
              />
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
                <Label>{t('weeklyHours')}</Label>
                <Input name="weekly_hours" type="number" min={1} max={40} defaultValue={client.weekly_hours} required />
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

              <div className="col-span-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clinical &amp; Matching Requirements</p>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input name="dob" type="date" defaultValue={client.dob ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>Auth Expiration</Label>
                <Input name="auth_exp_date" type="date" defaultValue={client.auth_exp_date ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>Assigned BCBA</Label>
                <Input name="assigned_bcba" defaultValue={client.assigned_bcba ?? ''} placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Input name="assigned_supervisor" defaultValue={client.assigned_supervisor ?? ''} placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Required therapist sex</Label>
                <Select name="required_sex" defaultValue={client.required_sex ?? 'none'}>
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
                <Select name="required_role" defaultValue={client.required_role ?? 'none'}>
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
                <Input name="required_language" defaultValue={client.required_language ?? ''} placeholder="e.g. Spanish" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pt-7">
                <input type="checkbox" name="two_to_one_eligible" defaultChecked={client.two_to_one_eligible} className="size-4 rounded border-gray-300" />
                2:1 eligible
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="no_new_therapist" defaultChecked={client.no_new_therapist} className="size-4 rounded border-gray-300" />
                No new BI / therapist (exclude new hires)
              </label>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clinical Profile</p>
              <ClinicalProfileFields defaults={client} />
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Onboarding</p>
              <OnboardingFields defaults={client} />
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

      <ParentTrainingLog
        clientId={client.id}
        entries={trainingLog}
        targetHours={client.parent_training_hours}
      />

      <EligibilityLog clientId={client.id} checks={eligibilityChecks} />
    </div>
  )
}
