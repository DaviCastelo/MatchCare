import { getOverlapWithClinic } from '@/lib/matching/rules'
import type { SessionInsert } from '@/lib/types/session'

export type SessionValidationInput = {
  client_id: string
  therapist_id: string
  location: 'Clinic' | 'School' | 'Home'
  day_of_week: number
  start_time: string
  end_time: string
  client_city?: string
  therapist_city?: string
}

export type ExistingSessionSlot = {
  id: string
  client_id: string
  therapist_id: string
  day_of_week: number
  start_time: string
  end_time: string
  status: string
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function slotsOverlap(
  a: { day_of_week: number; start_time: string; end_time: string },
  b: { day_of_week: number; start_time: string; end_time: string }
): boolean {
  if (a.day_of_week !== b.day_of_week) return false
  const aStart = timeToMinutes(a.start_time)
  const aEnd = timeToMinutes(a.end_time)
  const bStart = timeToMinutes(b.start_time)
  const bEnd = timeToMinutes(b.end_time)
  return aStart < bEnd && bStart < aEnd
}

export function validateSessionInput(
  input: SessionValidationInput,
  existing: ExistingSessionSlot[],
  excludeSessionId?: string
): { ok: true } | { ok: false; error: string } {
  const start = timeToMinutes(input.start_time)
  const end = timeToMinutes(input.end_time)

  if (end <= start) {
    return { ok: false, error: 'validation.endBeforeStart' }
  }

  const clinicSlot = getOverlapWithClinic({
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
  })

  if (!clinicSlot) {
    return { ok: false, error: 'validation.outsideClinicHours' }
  }

  if (
    input.location === 'Home' &&
    input.client_city &&
    input.therapist_city &&
    input.client_city.toLowerCase() !== input.therapist_city.toLowerCase()
  ) {
    return { ok: false, error: 'validation.homeCityMismatch' }
  }

  const activeExisting = existing.filter(
    (s) => s.status !== 'cancelled' && s.id !== excludeSessionId
  )

  for (const session of activeExisting) {
    if (session.therapist_id === input.therapist_id && slotsOverlap(input, session)) {
      return { ok: false, error: 'validation.therapistConflict' }
    }
    if (session.client_id === input.client_id && slotsOverlap(input, session)) {
      return { ok: false, error: 'validation.clientConflict' }
    }
  }

  return { ok: true }
}

export function toValidationInput(
  data: SessionInsert,
  clientCity?: string,
  therapistCity?: string
): SessionValidationInput {
  return {
    client_id: data.client_id,
    therapist_id: data.therapist_id,
    location: data.location,
    day_of_week: data.day_of_week,
    start_time: data.start_time,
    end_time: data.end_time,
    client_city: clientCity,
    therapist_city: therapistCity,
  }
}
