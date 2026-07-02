import type { ClientUpdate } from '@/lib/types/client'

// Ordered intake pipeline stages. Must match the clients_onboarding_stage_chk
// constraint in the database.
export const ONBOARDING_STAGES = [
  'Referral',
  'Eligibility Verification',
  'Intake Paperwork',
  'Assessment Scheduled',
  'Authorization Pending',
  'Staffing',
  'Active',
] as const

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number]

const sel = (v: FormDataEntryValue | null): string | null =>
  v && v !== 'none' ? String(v) : null

const txt = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

// Extracts the onboarding pipeline fields from a client form submission.
export function parseOnboardingFields(fd: FormData): Partial<ClientUpdate> {
  return {
    onboarding_stage: sel(fd.get('onboarding_stage')),
    referral_date: txt(fd.get('referral_date')),
    intake_date: txt(fd.get('intake_date')),
    assessment_date: txt(fd.get('assessment_date')),
    projected_start_date: txt(fd.get('projected_start_date')),
    actual_start_date: txt(fd.get('actual_start_date')),
    onboarding_owner: txt(fd.get('onboarding_owner')),
    onboarding_notes: txt(fd.get('onboarding_notes')),
  }
}
