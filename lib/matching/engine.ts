import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type {
  MatchOutput,
  MatchResult,
  ScheduleResult,
  Slot,
  TherapistAssignment,
} from '@/lib/types/matching'
import {
  hardRules,
  computeScore,
  computeOverlappingSlots,
  slotDurationHours,
  totalOverlapHours,
} from './rules'

// therapistHoursMap: therapistId → hours already scheduled this week (across all clients)
export function findEligibleTherapists(
  client: Client,
  therapists: Therapist[],
  therapistHoursMap: Record<string, number>
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
    const currentWeeklyHours = therapistHoursMap[therapist.id] ?? 0
    const { score, flags } = computeScore(client, therapist, overlappingSlots, currentWeeklyHours)

    eligible.push({ therapist, score, overlappingSlots, flags, currentWeeklyHours })
  }

  return {
    eligible: eligible.sort((a, b) => b.score - a.score),
    disqualified,
  }
}

// Block sizes (in hours) the scheduler will try, from longest to shortest.
// Longer blocks are preferred; shorter ones are the fallback for tight availability.
const BLOCK_SIZES = [4, 3, 2, 1]

// Builds the candidate (sessionCount × hoursEach) distributions that sum exactly
// to `weeklyHours` and give every selected therapist at least one session.
// e.g. weeklyHours=12, 2 therapists → [3×4h, 4×3h, 6×2h, 12×1h]
//      weeklyHours=4,  2 therapists → [2×2h, 4×1h]
export function buildScheduleCandidates(
  weeklyHours: number,
  therapistCount: number
): { sessionCount: number; hoursEach: number }[] {
  return BLOCK_SIZES.filter(
    (block) => weeklyHours % block === 0 && weeklyHours / block >= therapistCount
  ).map((block) => ({ sessionCount: weeklyHours / block, hoursEach: block }))
}

// Generates a distributed weekly schedule across 2-3 selected therapists.
// Each therapist gets at least 1 session; remaining sessions go to those who need more hours.
// `weeklyHours` is the client's configurable weekly load (defaults to 12 for back-compat).
export function generateMultiTherapistSchedule(
  selectedResults: MatchResult[],
  weeklyHours = 12
): ScheduleResult {
  if (selectedResults.length < 2) {
    return { ok: false, reason: 'min_therapist_count_not_met' }
  }

  // Verify all therapists have at least some overlap
  const anyEmpty = selectedResults.some((r) => totalOverlapHours(r.overlappingSlots) === 0)
  if (anyEmpty) return { ok: false, reason: 'no_valid_slots' }

  // Try longer session blocks first, falling back to shorter ones for tight availability
  for (const { sessionCount, hoursEach } of buildScheduleCandidates(
    weeklyHours,
    selectedResults.length
  )) {
    const assignments = tryDistribute(selectedResults, sessionCount, hoursEach)
    if (assignments) {
      const totalWeeklyHours = assignments.reduce((acc, a) => acc + a.weeklyHours, 0)
      return { ok: true, schedule: { assignments, totalWeeklyHours } }
    }
  }

  // Diagnose why it failed
  const totalAvailable = selectedResults.reduce(
    (acc, r) => acc + totalOverlapHours(r.overlappingSlots),
    0
  )
  if (totalAvailable < weeklyHours) return { ok: false, reason: 'insufficient_hours' }
  return { ok: false, reason: 'clinic_hours_conflict' }
}

// Distributes `sessionCount` sessions of `hoursEach` duration across the selected therapists.
// Phase 1: every therapist gets exactly 1 session (guarantees 2-3 therapists per client).
// Phase 2: remaining sessions go to therapists with lowest currentWeeklyHours first.
function tryDistribute(
  selectedResults: MatchResult[],
  sessionCount: number,
  hoursEach: number
): TherapistAssignment[] | null {
  if (sessionCount < selectedResults.length) return null

  const minutesEach = hoursEach * 60
  // Track all slots already committed (client cannot be in two places at once)
  const usedSlots: Slot[] = []
  const assignments = new Map<string, TherapistAssignment>()

  for (const r of selectedResults) {
    assignments.set(r.therapist.id, {
      therapist: r.therapist,
      slots: [],
      weeklyHours: 0,
    })
  }

  // Phase 1: one session per therapist
  for (const r of selectedResults) {
    const slot = pickNonConflictingSlot(r.overlappingSlots, usedSlots, minutesEach)
    if (!slot) return null
    const a = assignments.get(r.therapist.id)!
    a.slots.push(slot)
    a.weeklyHours += hoursEach
    usedSlots.push(slot)
  }

  // Phase 2: distribute remaining sessions, prioritising therapists with fewer hours
  let remaining = sessionCount - selectedResults.length
  const byNeed = [...selectedResults].sort(
    (a, b) => a.currentWeeklyHours - b.currentWeeklyHours
  )

  let rounds = 0
  while (remaining > 0) {
    let assignedThisRound = 0
    for (const r of byNeed) {
      if (remaining <= 0) break
      const slot = pickNonConflictingSlot(r.overlappingSlots, usedSlots, minutesEach)
      if (slot) {
        const a = assignments.get(r.therapist.id)!
        a.slots.push(slot)
        a.weeklyHours += hoursEach
        usedSlots.push(slot)
        remaining--
        assignedThisRound++
      }
    }
    if (assignedThisRound === 0) return null // stuck — can't fill remaining sessions
    if (++rounds > 10) return null // safety guard
  }

  return [...assignments.values()]
}

// Returns the first slot in `available` that fits `durationMinutes` without overlapping `used`.
function pickNonConflictingSlot(
  available: Slot[],
  used: Slot[],
  durationMinutes: number
): Slot | null {
  for (const slot of available) {
    const slotMinutes = timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)
    if (slotMinutes < durationMinutes) continue

    const proposed: Slot = {
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: minutesToTime(timeToMinutes(slot.start_time) + durationMinutes),
    }

    const conflict = used.some(
      (u) =>
        u.day_of_week === proposed.day_of_week &&
        timeToMinutes(u.start_time) < timeToMinutes(proposed.end_time) &&
        timeToMinutes(u.end_time) > timeToMinutes(proposed.start_time)
    )

    if (!conflict) return proposed
  }
  return null
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}

// Re-export for consumers that only need overlap utilities
export { slotDurationHours, totalOverlapHours, computeOverlappingSlots }
