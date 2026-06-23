import { describe, it, expect } from 'vitest'
import {
  findEligibleTherapists,
  generateMultiTherapistSchedule,
  buildScheduleCandidates,
} from '../engine'
import {
  baseClient,
  therapistA,
  therapistB,
  therapistC,
  therapistDisqualified,
  therapistTooLittleOverlap,
  makeMatchResult,
} from './fixtures'

// ─── findEligibleTherapists ───────────────────────────────────────────────────

describe('findEligibleTherapists', () => {
  it('returns eligible and disqualified in separate arrays', () => {
    const result = findEligibleTherapists(
      baseClient,
      [therapistA, therapistDisqualified],
      {}
    )
    expect(result.eligible).toHaveLength(1)
    expect(result.eligible[0].therapist.id).toBe('therapist-A')
    expect(result.disqualified).toHaveLength(1)
    expect(result.disqualified[0].therapist.id).toBe('therapist-D')
    expect(result.disqualified[0].failedRule).toBe('scoreCompatibility')
  })

  it('disqualifies therapist with insufficient overlap', () => {
    const result = findEligibleTherapists(
      baseClient,
      [therapistA, therapistTooLittleOverlap],
      {}
    )
    expect(result.eligible.map((r) => r.therapist.id)).toContain('therapist-A')
    expect(result.disqualified.map((r) => r.therapist.id)).toContain('therapist-E')
    expect(result.disqualified.find((r) => r.therapist.id === 'therapist-E')?.failedRule)
      .toBe('availabilityOverlap')
  })

  it('sorts eligible therapists by score descending', () => {
    // therapistA at 0h (load bonus = max) should score higher than therapistB at 12h
    const result = findEligibleTherapists(
      baseClient,
      [therapistB, therapistA], // B listed first intentionally
      { 'therapist-A': 0, 'therapist-B': 12 }
    )
    expect(result.eligible[0].therapist.id).toBe('therapist-A')
    expect(result.eligible[1].therapist.id).toBe('therapist-B')
  })

  it('includes currentWeeklyHours in each MatchResult', () => {
    const result = findEligibleTherapists(
      baseClient,
      [therapistA, therapistB],
      { 'therapist-A': 5, 'therapist-B': 10 }
    )
    const a = result.eligible.find((r) => r.therapist.id === 'therapist-A')!
    const b = result.eligible.find((r) => r.therapist.id === 'therapist-B')!
    expect(a.currentWeeklyHours).toBe(5)
    expect(b.currentWeeklyHours).toBe(10)
  })

  it('defaults currentWeeklyHours to 0 when therapist not in map', () => {
    const result = findEligibleTherapists(baseClient, [therapistA], {})
    expect(result.eligible[0].currentWeeklyHours).toBe(0)
  })

  it('returns empty eligible when no therapists pass hard rules', () => {
    const result = findEligibleTherapists(baseClient, [therapistDisqualified], {})
    expect(result.eligible).toHaveLength(0)
    expect(result.disqualified).toHaveLength(1)
  })
})

// ─── findEligibleTherapists — requirements ───────────────────────────────────

describe('findEligibleTherapists — requirements', () => {
  it('disqualifies on requiredSex mismatch', () => {
    // therapistA is Female; require Male → disqualified
    const client = { ...baseClient, required_sex: 'Male' as const }
    const result = findEligibleTherapists(client, [therapistA], {})
    expect(result.eligible).toHaveLength(0)
    expect(result.disqualified[0].failedRule).toBe('requiredSex')
  })

  it('disqualifies a new hire when the client is flagged no_new_therapist', () => {
    const client = { ...baseClient, no_new_therapist: true }
    const newHire = { ...therapistA, is_new_hire: true }
    const result = findEligibleTherapists(client, [newHire], {})
    expect(result.disqualified.some((d) => d.failedRule === 'noNewTherapist')).toBe(true)
  })
})

// ─── findEligibleTherapists — proximity ──────────────────────────────────────

describe('findEligibleTherapists — proximity', () => {
  const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }

  it('blocks a Home therapist beyond 20 miles (failedRule proximity)', () => {
    const result = findEligibleTherapists(homeClient, [therapistA], {}, {}, { 'therapist-A': 25 })
    expect(result.eligible).toHaveLength(0)
    expect(result.disqualified[0].failedRule).toBe('proximity')
  })

  it('allows a Home therapist within 20 miles', () => {
    const result = findEligibleTherapists(homeClient, [therapistA], {}, {}, { 'therapist-A': 10 })
    expect(result.eligible.map((r) => r.therapist.id)).toContain('therapist-A')
  })

  it('does NOT block a far therapist for Clinic sessions (distance only lowers the score)', () => {
    const result = findEligibleTherapists(baseClient, [therapistA], {}, {}, { 'therapist-A': 50 })
    expect(result.eligible.map((r) => r.therapist.id)).toContain('therapist-A')
  })

  it('does NOT block a Home therapist when distance is unknown (null)', () => {
    const result = findEligibleTherapists(homeClient, [therapistA], {}, {}, { 'therapist-A': null })
    expect(result.eligible.map((r) => r.therapist.id)).toContain('therapist-A')
  })

  it('sets distanceMiles on each eligible result', () => {
    const result = findEligibleTherapists(baseClient, [therapistA], {}, {}, { 'therapist-A': 7 })
    expect(result.eligible[0].distanceMiles).toBe(7)
  })

  it('ranks a closer therapist above a farther one, all else equal', () => {
    const result = findEligibleTherapists(
      baseClient,
      [therapistA, therapistB],
      { 'therapist-A': 0, 'therapist-B': 0 },
      {},
      { 'therapist-A': 2, 'therapist-B': 18 }
    )
    expect(result.eligible[0].therapist.id).toBe('therapist-A')
  })
})

// ─── generateMultiTherapistSchedule ──────────────────────────────────────────

describe('generateMultiTherapistSchedule', () => {

  // ── Happy paths ──

  it('succeeds with 2 therapists and returns 12h total', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 12),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(12)
    expect(result.schedule.assignments).toHaveLength(2)
  })

  it('succeeds with 3 therapists', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 5),
      makeMatchResult(therapistC, 10),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(12)
    expect(result.schedule.assignments).toHaveLength(3)
  })

  it('gives each therapist at least 1 session', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 12),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const assignment of result.schedule.assignments) {
      expect(assignment.slots.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('assigns no two sessions with overlapping times to the same client', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 12),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Collect all assigned slots across all therapists
    const allSlots = result.schedule.assignments.flatMap((a) => a.slots)
    for (let i = 0; i < allSlots.length; i++) {
      for (let j = i + 1; j < allSlots.length; j++) {
        const a = allSlots[i]
        const b = allSlots[j]
        if (a.day_of_week !== b.day_of_week) continue
        const aStart = toMin(a.start_time), aEnd = toMin(a.end_time)
        const bStart = toMin(b.start_time), bEnd = toMin(b.end_time)
        const overlap = aStart < bEnd && aEnd > bStart
        expect(overlap).toBe(false)
      }
    }
  })

  it('prioritises therapist with fewer current hours when distributing extra sessions', () => {
    // therapistA has 0h (needs more), therapistB has 12h (almost full)
    // With 4×3h distribution: A should get 2 sessions, B gets 2 as well (all they can)
    // With 3×4h distribution: A should get 2 sessions (extra goes to A), B gets 1
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 12),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const aAssignment = result.schedule.assignments.find(
      (a) => a.therapist.id === 'therapist-A'
    )!
    const bAssignment = result.schedule.assignments.find(
      (a) => a.therapist.id === 'therapist-B'
    )!

    // therapistA should have >= therapistB sessions (since A needs more hours)
    expect(aAssignment.slots.length).toBeGreaterThanOrEqual(bAssignment.slots.length)
  })

  it('weeklyHours per assignment matches slot durations', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 12),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    for (const assignment of result.schedule.assignments) {
      const summedHours = assignment.slots.reduce(
        (acc, s) => acc + (toMin(s.end_time) - toMin(s.start_time)) / 60,
        0
      )
      expect(summedHours).toBe(assignment.weeklyHours)
    }
  })

  // ── Failure paths ──

  it('fails with only 1 therapist', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('min_therapist_count_not_met')
  })

  it('fails with empty array', () => {
    const result = generateMultiTherapistSchedule([])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('min_therapist_count_not_met')
  })

  it('fails when therapists have insufficient total hours', () => {
    // Each therapist has only ~3h of valid overlap (one short slot)
    const shortSlotTherapist1 = {
      ...therapistA,
      id: 'short-1',
      availability: [{ id: 's1', therapist_id: 'short-1', day_of_week: 1, start_time: '09:00', end_time: '12:00' }],
    }
    const shortSlotTherapist2 = {
      ...therapistB,
      id: 'short-2',
      availability: [{ id: 's2', therapist_id: 'short-2', day_of_week: 2, start_time: '09:00', end_time: '12:00' }],
    }

    const result = generateMultiTherapistSchedule([
      makeMatchResult(shortSlotTherapist1, 0),
      makeMatchResult(shortSlotTherapist2, 0),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    // 3h + 3h = 6h total available, < 12h
    expect(result.reason).toBe('insufficient_hours')
  })

  it('fails when a therapist has zero overlapping slots', () => {
    const noSlotTherapist = {
      ...therapistA,
      id: 'no-slots',
      availability: [], // no availability
    }

    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(noSlotTherapist, 0, []),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('no_valid_slots')
  })
})

// ─── Configurable weekly load ────────────────────────────────────────────────

describe('buildScheduleCandidates', () => {
  it('builds 12h candidates from 3–5h blocks, longest first', () => {
    // 5 does not divide 12; only 4h and 3h sessions apply
    expect(buildScheduleCandidates(12, 2)).toEqual([
      { sessionCount: 3, hoursEach: 4 },
      { sessionCount: 4, hoursEach: 3 },
    ])
  })

  it('uses 5h sessions when the weekly load is a multiple of 5', () => {
    expect(buildScheduleCandidates(15, 3)).toEqual([
      { sessionCount: 3, hoursEach: 5 },
      { sessionCount: 5, hoursEach: 3 },
    ])
  })

  it('returns no candidates when the load cannot be split into 3–5h sessions', () => {
    // 4h cannot be two sessions of >= 3h each
    expect(buildScheduleCandidates(4, 2)).toEqual([])
  })

  it('never produces sessions shorter than 3h or longer than 5h', () => {
    for (const weekly of [6, 9, 10, 12, 15, 18, 20]) {
      for (const c of buildScheduleCandidates(weekly, 2)) {
        expect(c.hoursEach).toBeGreaterThanOrEqual(3)
        expect(c.hoursEach).toBeLessThanOrEqual(5)
      }
    }
  })
})

describe('generateMultiTherapistSchedule — configurable weekly hours', () => {
  // Two therapists offering only 1-hour overlapping windows (the "Davi" case)
  const shortWindows1 = {
    ...therapistA,
    id: 'sw-1',
    availability: [
      { id: 'sw1a', therapist_id: 'sw-1', day_of_week: 1, start_time: '15:00', end_time: '16:00' },
      { id: 'sw1b', therapist_id: 'sw-1', day_of_week: 4, start_time: '15:00', end_time: '16:00' },
    ],
  }
  const shortWindows2 = {
    ...therapistB,
    id: 'sw-2',
    availability: [
      { id: 'sw2a', therapist_id: 'sw-2', day_of_week: 2, start_time: '15:00', end_time: '16:00' },
      { id: 'sw2b', therapist_id: 'sw-2', day_of_week: 3, start_time: '15:00', end_time: '16:00' },
    ],
  }

  it('rejects a weekly load that cannot be split into 3–5h sessions', () => {
    // 4h with 2 therapists is impossible (min session 3h → min 6h for 2 sessions)
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(therapistA, 0), makeMatchResult(therapistB, 0)],
      4
    )
    expect(result.ok).toBe(false)
  })

  it('honours a custom 6h/week load as two 3h sessions', () => {
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(therapistA, 0), makeMatchResult(therapistB, 0)],
      6
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(6)
    // every session is between 3h and 5h
    for (const a of result.schedule.assignments) {
      for (const s of a.slots) {
        const h = (toMin(s.end_time) - toMin(s.start_time)) / 60
        expect(h).toBeGreaterThanOrEqual(3)
        expect(h).toBeLessThanOrEqual(5)
      }
    }
  })

  it('defaults to a 12h/week load when weeklyHours is omitted', () => {
    const result = generateMultiTherapistSchedule([
      makeMatchResult(therapistA, 0),
      makeMatchResult(therapistB, 0),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(12)
  })

  it('reports insufficient_hours relative to the configured load', () => {
    // 4h of total overlap but a 12h load requested
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(shortWindows1, 0), makeMatchResult(shortWindows2, 0)],
      12
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('insufficient_hours')
  })
})

// ─── Window packing (slide within a window) ──────────────────────────────────

describe('generateMultiTherapistSchedule — window packing', () => {
  it('stacks multiple sessions inside one wide window (slide fix)', () => {
    // w1 only Mon 09:00–17:00, w2 only Tue 09:00–17:00. 12h needs w1 to host
    // TWO 4h sessions on Monday (09–13 and 13–17) — impossible without sliding.
    const w1 = makeMatchResult({ ...therapistA, id: 'w-1' }, 0, [
      { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    ])
    const w2 = makeMatchResult({ ...therapistB, id: 'w-2' }, 0, [
      { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    ])
    const result = generateMultiTherapistSchedule([w1, w2], 12)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(12)

    // some therapist has 2+ sessions on the same day (proves stacking)
    const stacked = result.schedule.assignments.some((a) => {
      const byDay = new Map<number, number>()
      for (const s of a.slots) byDay.set(s.day_of_week, (byDay.get(s.day_of_week) ?? 0) + 1)
      return [...byDay.values()].some((n) => n >= 2)
    })
    expect(stacked).toBe(true)

    // no client double-booking + every session within 3–5h
    const all = result.schedule.assignments.flatMap((a) => a.slots)
    for (const s of all) {
      const h = (toMin(s.end_time) - toMin(s.start_time)) / 60
      expect(h).toBeGreaterThanOrEqual(3)
      expect(h).toBeLessThanOrEqual(5)
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j]
        if (a.day_of_week !== b.day_of_week) continue
        const overlap = toMin(a.start_time) < toMin(b.end_time) && toMin(a.end_time) > toMin(b.start_time)
        expect(overlap).toBe(false)
      }
    }
  })

  it('uses 5h sessions (max block) when the weekly load fits', () => {
    const w1 = makeMatchResult({ ...therapistA, id: 'w5-1' }, 0, [
      { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    ])
    const w2 = makeMatchResult({ ...therapistB, id: 'w5-2' }, 0, [
      { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    ])
    const result = generateMultiTherapistSchedule([w1, w2], 10)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(10)
    for (const a of result.schedule.assignments) {
      for (const s of a.slots) {
        expect((toMin(s.end_time) - toMin(s.start_time)) / 60).toBe(5)
      }
    }
  })
})

// ─── Schedule failure diagnostics ────────────────────────────────────────────

describe('generateMultiTherapistSchedule — failure reasons', () => {
  it('reports too_many_therapists when the load cannot cover one 3h session each', () => {
    // 6h load but 3 therapists → would need 3×3h = 9h > 6h
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(therapistA, 0), makeMatchResult(therapistB, 0), makeMatchResult(therapistC, 0)],
      6
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('too_many_therapists')
  })

  it('succeeds for the same 6h load with only 2 therapists', () => {
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(therapistA, 0), makeMatchResult(therapistB, 0)],
      6
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.schedule.totalWeeklyHours).toBe(6)
  })

  it('reports incompatible_weekly_hours when the load has no 3–5h split', () => {
    // 7h with 2 therapists: 7 >= 6 but not divisible by 3/4/5
    const result = generateMultiTherapistSchedule(
      [makeMatchResult(therapistA, 0), makeMatchResult(therapistB, 0)],
      7
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('incompatible_weekly_hours')
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
