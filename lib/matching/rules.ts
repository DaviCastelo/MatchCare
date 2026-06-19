import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { Slot, MatchFlag } from '@/lib/types/matching'

// Clinic operating hours: [day_of_week]: { open: 'HH:MM', close: 'HH:MM' }
const CLINIC_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: '10:00', close: '14:00' }, // Sunday
  1: { open: '09:00', close: '19:00' }, // Monday
  2: { open: '09:00', close: '19:00' }, // Tuesday
  3: { open: '09:00', close: '19:00' }, // Wednesday
  4: { open: '09:00', close: '19:00' }, // Thursday
  5: { open: '09:00', close: '19:00' }, // Friday
  6: { open: '09:30', close: '14:30' }, // Saturday
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, '0')
  const min = (m % 60).toString().padStart(2, '0')
  return `${h}:${min}`
}

export function getOverlapWithClinic(slot: Slot): Slot | null {
  const clinicHours = CLINIC_HOURS[slot.day_of_week]
  if (!clinicHours) return null

  const slotStart = timeToMinutes(slot.start_time)
  const slotEnd = timeToMinutes(slot.end_time)
  const clinicStart = timeToMinutes(clinicHours.open)
  const clinicEnd = timeToMinutes(clinicHours.close)

  const overlapStart = Math.max(slotStart, clinicStart)
  const overlapEnd = Math.min(slotEnd, clinicEnd)

  if (overlapEnd - overlapStart < 60) return null // less than 1h overlap is not useful

  return {
    day_of_week: slot.day_of_week,
    start_time: minutesToTime(overlapStart),
    end_time: minutesToTime(overlapEnd),
  }
}

export function computeOverlappingSlots(client: Client, therapist: Therapist): Slot[] {
  const clientSlots = client.availability ?? []
  const therapistSlots = therapist.availability ?? []
  const result: Slot[] = []

  for (const cs of clientSlots) {
    for (const ts of therapistSlots) {
      if (cs.day_of_week !== ts.day_of_week) continue

      const csStart = timeToMinutes(cs.start_time)
      const csEnd = timeToMinutes(cs.end_time)
      const tsStart = timeToMinutes(ts.start_time)
      const tsEnd = timeToMinutes(ts.end_time)

      const overlapStart = Math.max(csStart, tsStart)
      const overlapEnd = Math.min(csEnd, tsEnd)

      if (overlapEnd <= overlapStart) continue

      const combined: Slot = {
        day_of_week: cs.day_of_week,
        start_time: minutesToTime(overlapStart),
        end_time: minutesToTime(overlapEnd),
      }

      const withClinic = getOverlapWithClinic(combined)
      if (withClinic) result.push(withClinic)
    }
  }

  return result
}

export function slotDurationHours(slot: Slot): number {
  return (timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)) / 60
}

export function totalOverlapHours(slots: Slot[]): number {
  return slots.reduce((acc, s) => acc + slotDurationHours(s), 0)
}

// ─── Hard Rules ───────────────────────────────────────────────────────────────

export function checkScoreCompatibility(client: Client, therapist: Therapist): boolean {
  if (therapist.professional_score >= 5) return client.behavior_score >= 5
  return client.behavior_score <= 5
}

export function checkCityMatch(client: Client, therapist: Therapist): boolean {
  if (client.preferred_session_location === 'Home') {
    return client.city.toLowerCase() === therapist.city.toLowerCase()
  }
  return true // city match is soft for Clinic/School
}

export function checkAvailabilityOverlap(client: Client, therapist: Therapist): boolean {
  const slots = computeOverlappingSlots(client, therapist)
  return totalOverlapHours(slots) >= 3
}

export type HardRule = {
  name: 'scoreCompatibility' | 'cityMatch' | 'availabilityOverlap'
  check: (client: Client, therapist: Therapist) => boolean
}

export const hardRules: HardRule[] = [
  { name: 'scoreCompatibility', check: checkScoreCompatibility },
  { name: 'cityMatch', check: checkCityMatch },
  { name: 'availabilityOverlap', check: checkAvailabilityOverlap },
]

// ─── Soft Rules / Scoring ────────────────────────────────────────────────────

export function computeScore(
  client: Client,
  therapist: Therapist,
  slots: Slot[],
  therapistCurrentHours = 0
): { score: number; flags: MatchFlag[] } {
  let score = 0
  const flags: MatchFlag[] = []

  // Language match: +10
  if (client.language.toLowerCase() === therapist.language.toLowerCase()) score += 10

  // Same city (non-Home sessions): +15
  if (
    client.preferred_session_location !== 'Home' &&
    client.city.toLowerCase() === therapist.city.toLowerCase()
  ) {
    score += 15
  }

  // Available hours (proportional, max +20)
  const hours = totalOverlapHours(slots)
  score += Math.min(20, Math.round(hours * 2))

  // Score proximity: closer to client behavior score = better
  const scoreDiff = Math.abs(therapist.professional_score - client.behavior_score)
  score += Math.max(0, 10 - scoreDiff * 2)

  // Therapist load bonus: prefer therapists who still need hours toward 15h/week (+15 max)
  // Therapist at 0h gets full +15; at 15h+ gets 0
  const WEEKLY_TARGET = 15
  score += Math.max(0, Math.round((1 - therapistCurrentHours / WEEKLY_TARGET) * 15))

  if (hasGenderMismatch(client, therapist)) {
    flags.push('GENDER_SENSITIVITY_WARNING')
  }

  return { score, flags }
}

/** Non-blocking: warn when client and therapist sex differ (both must be known). */
export function hasGenderMismatch(client: Client, therapist: Therapist): boolean {
  if (!therapist.sex) return false
  return client.sex !== therapist.sex
}
