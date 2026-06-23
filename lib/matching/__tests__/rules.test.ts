import { describe, it, expect } from 'vitest'
import {
  checkScoreCompatibility,
  checkAvailabilityOverlap,
  computeScore,
  computeOverlappingSlots,
  hasGenderMismatch,
  totalOverlapHours,
  subtractBusySlots,
} from '../rules'
import {
  baseClient,
  therapistA,
  therapistB,
  therapistC,
  therapistDisqualified,
  therapistTooLittleOverlap,
} from './fixtures'

// ─── checkScoreCompatibility ─────────────────────────────────────────────────

describe('checkScoreCompatibility', () => {
  it('approves therapist with score >= 5 when client score >= 5', () => {
    // therapistA.professional_score = 6, baseClient.behavior_score = 6
    expect(checkScoreCompatibility(baseClient, therapistA)).toBe(true)
  })

  it('rejects therapist with score < 5 when client score > 5', () => {
    // therapistDisqualified.professional_score = 3, baseClient.behavior_score = 6
    expect(checkScoreCompatibility(baseClient, therapistDisqualified)).toBe(false)
  })

  it('approves therapist with score < 5 when client score <= 5', () => {
    const lowScoreClient = { ...baseClient, behavior_score: 4 }
    expect(checkScoreCompatibility(lowScoreClient, therapistDisqualified)).toBe(true)
  })

  it('rejects therapist with score >= 5 when client score < 5', () => {
    const lowScoreClient = { ...baseClient, behavior_score: 4 }
    expect(checkScoreCompatibility(lowScoreClient, therapistA)).toBe(false)
  })
})

// ─── checkAvailabilityOverlap ─────────────────────────────────────────────────

describe('checkAvailabilityOverlap', () => {
  it('passes when overlap is >= 3h', () => {
    // therapistA has Mon + Wed 09:00–17:00 → huge overlap
    expect(checkAvailabilityOverlap(baseClient, therapistA)).toBe(true)
  })

  it('rejects when overlap is < 3h', () => {
    expect(checkAvailabilityOverlap(baseClient, therapistTooLittleOverlap)).toBe(false)
  })

  it('rejects when there is zero overlap', () => {
    const noOverlapTherapist = {
      ...therapistA,
      availability: [
        // Saturday 15:00–18:00 — outside clinic hours (clinic closes at 14:30), so overlap = 0
        { id: 'x', therapist_id: 'x', day_of_week: 6, start_time: '15:00', end_time: '18:00' },
      ],
    }
    expect(checkAvailabilityOverlap(baseClient, noOverlapTherapist)).toBe(false)
  })
})

// ─── computeOverlappingSlots ──────────────────────────────────────────────────

describe('computeOverlappingSlots', () => {
  it('returns slots for each matching day clipped to clinic hours', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    // therapistA: Mon + Wed
    expect(slots).toHaveLength(2)
    expect(slots.map((s) => s.day_of_week).sort()).toEqual([1, 3])
  })

  it('clips slots to clinic operating hours (Mon 09:00–19:00)', () => {
    // Both client and therapist available until 21:00 on Monday
    // Clinic closes at 19:00 → result should be clipped to 19:00
    const extendedClient = {
      ...baseClient,
      availability: [
        { id: 'ce', client_id: 'client-1', day_of_week: 1, start_time: '09:00', end_time: '21:00' },
      ],
    }
    const extendedTherapist = {
      ...therapistA,
      availability: [
        { id: 'te', therapist_id: 'therapist-A', day_of_week: 1, start_time: '09:00', end_time: '21:00' },
      ],
    }
    const slots = computeOverlappingSlots(extendedClient, extendedTherapist)
    expect(slots).toHaveLength(1)
    expect(slots[0].end_time).toBe('19:00')
  })

  it('returns empty array when no days match', () => {
    const weekendOnlyTherapist = {
      ...therapistA,
      availability: [
        { id: 'x', therapist_id: 'x', day_of_week: 0, start_time: '10:00', end_time: '14:00' },
      ],
    }
    // baseClient has no Sunday availability
    const slots = computeOverlappingSlots(baseClient, weekendOnlyTherapist)
    expect(slots).toHaveLength(0)
  })
})

// ─── totalOverlapHours ────────────────────────────────────────────────────────

describe('totalOverlapHours', () => {
  it('sums hours across all slots', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    // Mon 09:00–17:00 (8h) + Wed 09:00–17:00 (8h) = 16h
    expect(totalOverlapHours(slots)).toBe(16)
  })

  it('returns 0 for empty array', () => {
    expect(totalOverlapHours([])).toBe(0)
  })
})

// ─── computeScore ─────────────────────────────────────────────────────────────

describe('computeScore', () => {
  it('adds +10 for language match', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const { score } = computeScore(baseClient, therapistA, slots, 0, 2)
    // language (+10) + proximity (+20 at 2mi) + hours + score-proximity + load
    expect(score).toBeGreaterThanOrEqual(10)
  })

  it('isolates the +10 language contribution', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const differentLangTherapist = { ...therapistA, language: 'en' }
    const { score: sameLang } = computeScore(baseClient, therapistA, slots, 0, 2)
    const { score: diffLang } = computeScore(baseClient, differentLangTherapist, slots, 0, 2)
    // same distance in both → only language differs → +10
    expect(sameLang - diffLang).toBe(10)
  })

  // ─── proximity (graded distance) ───
  it('adds graded proximity points by distance (closer = more)', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const near = computeScore(baseClient, therapistA, slots, 0, 2).score // +20
    const mid = computeScore(baseClient, therapistA, slots, 0, 10).score // +10
    const far = computeScore(baseClient, therapistA, slots, 0, 25).score // +0
    expect(near - mid).toBe(10)
    expect(mid - far).toBe(10)
    expect(near).toBeGreaterThan(far)
  })

  it('flags MISSING_LOCATION and adds 0 proximity when distance is unknown', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const { score: known } = computeScore(baseClient, therapistA, slots, 0, 2)
    const { score: unknown, flags } = computeScore(baseClient, therapistA, slots, 0, null)
    expect(flags).toContain('MISSING_LOCATION')
    expect(known - unknown).toBe(20) // unknown loses the full proximity bonus
  })

  it('flags LONG_COMMUTE for a far-but-allowed Home session (> 12 mi)', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }
    const { flags } = computeScore(homeClient, therapistA, slots, 0, 15)
    expect(flags).toContain('LONG_COMMUTE')
  })

  it('does NOT flag LONG_COMMUTE for a close Home session', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }
    const { flags } = computeScore(homeClient, therapistA, slots, 0, 5)
    expect(flags).not.toContain('LONG_COMMUTE')
  })

  it('gives higher score to therapist with fewer current weekly hours (load bonus)', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const { score: scoreAt0h } = computeScore(baseClient, therapistA, slots, 0)
    const { score: scoreAt12h } = computeScore(baseClient, therapistA, slots, 12)
    const { score: scoreAt15h } = computeScore(baseClient, therapistA, slots, 15)
    expect(scoreAt0h).toBeGreaterThan(scoreAt12h)
    expect(scoreAt12h).toBeGreaterThan(scoreAt15h)
    // At 0h → full +15 bonus; at 15h → 0 bonus
    expect(scoreAt0h - scoreAt15h).toBe(15)
  })

  it('load bonus is 0 when therapist is at or above 15h', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const { score: at15 } = computeScore(baseClient, therapistA, slots, 15)
    const { score: at20 } = computeScore(baseClient, therapistA, slots, 20)
    // Should be the same — bonus doesn't go negative
    expect(at15).toBe(at20)
  })

  it('adds GENDER_SENSITIVITY_WARNING when client and therapist sex differ', () => {
    const femaleClient = { ...baseClient, sex: 'Female' as const }
    const maleTherapist = { ...therapistA, sex: 'Male' as const }
    const slots = computeOverlappingSlots(femaleClient, maleTherapist)
    const { flags } = computeScore(femaleClient, maleTherapist, slots, 0)
    expect(flags).toContain('GENDER_SENSITIVITY_WARNING')
  })

  it('does NOT add gender warning when sex matches', () => {
    const maleTherapist = { ...therapistA, sex: 'Male' as const }
    const slots = computeOverlappingSlots(baseClient, maleTherapist)
    const { flags } = computeScore(baseClient, maleTherapist, slots, 0)
    expect(flags).not.toContain('GENDER_SENSITIVITY_WARNING')
  })

  it('does NOT add gender warning when therapist sex is unknown', () => {
    const femaleClient = { ...baseClient, sex: 'Female' as const }
    const unknownSexTherapist = { ...therapistA, sex: null }
    const slots = computeOverlappingSlots(femaleClient, unknownSexTherapist)
    const { flags } = computeScore(femaleClient, unknownSexTherapist, slots, 0)
    expect(flags).not.toContain('GENDER_SENSITIVITY_WARNING')
  })
})

describe('hasGenderMismatch', () => {
  it('returns true when sex differs and therapist sex is set', () => {
    expect(hasGenderMismatch(
      { ...baseClient, sex: 'Female' },
      { ...therapistA, sex: 'Male' }
    )).toBe(true)
  })

  it('returns false when sex matches', () => {
    expect(hasGenderMismatch(baseClient, { ...therapistA, sex: 'Male' })).toBe(false)
  })

  it('returns false when therapist sex is null', () => {
    expect(hasGenderMismatch(
      { ...baseClient, sex: 'Female' },
      { ...therapistA, sex: null }
    )).toBe(false)
  })
})

// ─── subtractBusySlots ───────────────────────────────────────────────────────

describe('subtractBusySlots', () => {
  const win = [{ day_of_week: 1, start_time: '08:00', end_time: '17:00' }]

  it('returns the window unchanged when there is no busy time', () => {
    expect(subtractBusySlots(win, [])).toEqual(win)
  })

  it('splits a window around a busy interval in the middle', () => {
    const result = subtractBusySlots(win, [
      { day_of_week: 1, start_time: '12:00', end_time: '13:00' },
    ])
    expect(result).toEqual([
      { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
      { day_of_week: 1, start_time: '13:00', end_time: '17:00' },
    ])
  })

  it('trims the start when busy overlaps the beginning', () => {
    const result = subtractBusySlots(win, [
      { day_of_week: 1, start_time: '07:00', end_time: '10:00' },
    ])
    expect(result).toEqual([{ day_of_week: 1, start_time: '10:00', end_time: '17:00' }])
  })

  it('removes the window entirely when fully booked', () => {
    const result = subtractBusySlots(win, [
      { day_of_week: 1, start_time: '08:00', end_time: '17:00' },
    ])
    expect(result).toEqual([])
  })

  it('ignores busy intervals on other days', () => {
    const result = subtractBusySlots(win, [
      { day_of_week: 2, start_time: '09:00', end_time: '16:00' },
    ])
    expect(result).toEqual(win)
  })

  it('treats back-to-back intervals as non-overlapping (adjacency)', () => {
    // busy ends exactly when the window starts → nothing removed
    const result = subtractBusySlots(win, [
      { day_of_week: 1, start_time: '06:00', end_time: '08:00' },
    ])
    expect(result).toEqual(win)
  })

  it('subtracts multiple busy intervals', () => {
    const result = subtractBusySlots(win, [
      { day_of_week: 1, start_time: '09:00', end_time: '10:00' },
      { day_of_week: 1, start_time: '14:00', end_time: '15:00' },
    ])
    expect(result).toEqual([
      { day_of_week: 1, start_time: '08:00', end_time: '09:00' },
      { day_of_week: 1, start_time: '10:00', end_time: '14:00' },
      { day_of_week: 1, start_time: '15:00', end_time: '17:00' },
    ])
  })
})
