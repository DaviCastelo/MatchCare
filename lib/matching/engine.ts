import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { MatchOutput, ScheduleResult, Slot, WeeklySchedule } from '@/lib/types/matching'
import {
  hardRules,
  computeScore,
  computeOverlappingSlots,
  slotDurationHours,
  totalOverlapHours,
} from './rules'

export function findEligibleTherapists(
  client: Client,
  therapists: Therapist[] // pre-filtered by remaining weekly capacity (Server Action responsibility)
): MatchOutput {
  const eligible: MatchOutput['eligible'] = []
  const disqualified: MatchOutput['disqualified'] = []

  for (const therapist of therapists) {
    const failed = hardRules.find((rule) => !rule.check(client, therapist))
    if (failed) {
      disqualified.push({ therapist, failedRule: failed.name })
      continue
    }

    const overlappingSlots = computeOverlappingSlots(client, therapist)
    const { score, flags } = computeScore(client, therapist, overlappingSlots)

    eligible.push({ therapist, score, overlappingSlots, flags })
  }

  return {
    eligible: eligible.sort((a, b) => b.score - a.score),
    disqualified,
  }
}

export function generateWeeklySchedule(
  _client: Client,
  _therapist: Therapist,
  overlappingSlots: Slot[]
): ScheduleResult {
  const TARGET_HOURS = 12

  // Try 3 sessions × 4h first, then 4 sessions × 3h
  const options = [
    { sessions: 3, hoursEach: 4 },
    { sessions: 4, hoursEach: 3 },
  ]

  for (const { sessions, hoursEach } of options) {
    const schedule = tryBuildSchedule(overlappingSlots, sessions, hoursEach)
    if (schedule) {
      const totalHours = schedule.reduce((acc, s) => acc + slotDurationHours(s), 0)
      if (totalHours >= TARGET_HOURS) {
        return { ok: true, schedule }
      }
    }
  }

  // Check why it failed
  const total = totalOverlapHours(overlappingSlots)
  if (overlappingSlots.length === 0) return { ok: false, reason: 'no_valid_slots' }
  if (total < TARGET_HOURS) return { ok: false, reason: 'insufficient_hours' }
  return { ok: false, reason: 'clinic_hours_conflict' }
}

function tryBuildSchedule(
  slots: Slot[],
  sessionCount: number,
  hoursEach: number
): WeeklySchedule | null {
  const minutesEach = hoursEach * 60
  const result: WeeklySchedule = []

  for (const slot of slots) {
    if (result.length >= sessionCount) break

    const slotMinutes =
      timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)

    if (slotMinutes >= minutesEach) {
      result.push({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: minutesToTime(timeToMinutes(slot.start_time) + minutesEach),
      })
    }
  }

  return result.length === sessionCount ? result : null
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}
