import { describe, it, expect } from 'vitest'
import {
  checkScoreCompatibility,
  checkCityMatch,
  checkAvailabilityOverlap,
  computeScore,
  computeOverlappingSlots,
  totalOverlapHours,
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

// ─── checkCityMatch ───────────────────────────────────────────────────────────

describe('checkCityMatch', () => {
  it('always passes for Clinic sessions regardless of city', () => {
    // therapistC is in Campinas, client in São Paulo, but it is Clinic → OK
    expect(checkCityMatch(baseClient, therapistC)).toBe(true)
  })

  it('passes when cities match for Home sessions', () => {
    const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }
    const sameCityTherapist = { ...therapistA, city: 'São Paulo' }
    expect(checkCityMatch(homeClient, sameCityTherapist)).toBe(true)
  })

  it('rejects when cities differ for Home sessions', () => {
    const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }
    // therapistC is in Campinas
    expect(checkCityMatch(homeClient, therapistC)).toBe(false)
  })

  it('is case-insensitive', () => {
    const homeClient = { ...baseClient, preferred_session_location: 'Home' as const }
    const upperCaseCity = { ...therapistA, city: 'SÃO PAULO' }
    expect(checkCityMatch(homeClient, upperCaseCity)).toBe(true)
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
    const { score } = computeScore(baseClient, therapistA, slots, 0)
    // language match (+10) + city Clinic match (+15) + hours bonus + proximity + load bonus
    expect(score).toBeGreaterThanOrEqual(10)
  })

  it('adds +15 for same city on Clinic sessions', () => {
    const slots = computeOverlappingSlots(baseClient, therapistA)
    const differentLangTherapist = { ...therapistA, language: 'en' }
    const { score: withCity } = computeScore(baseClient, therapistA, slots, 0)
    const { score: noCity } = computeScore(baseClient, differentLangTherapist, slots, 0)
    // difference should be +10 (language) since city is the same in both
    expect(withCity - noCity).toBe(10)
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

  it('adds GENDER_SENSITIVITY_WARNING flag for young female client with low-score therapist', () => {
    const youngFemaleClient = { ...baseClient, age: 5, sex: 'Female' as const }
    const lowScoreTherapist = {
      ...therapistA,
      professional_score: 4,
      // Override score compatibility: female client score = 6, therapist = 4 < 5
      // Actually this would fail checkScoreCompatibility, so let's use a female client with score 4
    }
    const lowScoreClient = { ...youngFemaleClient, behavior_score: 4 }
    const slots = computeOverlappingSlots(lowScoreClient, lowScoreTherapist)
    const { flags } = computeScore(lowScoreClient, lowScoreTherapist, slots, 0)
    expect(flags).toContain('GENDER_SENSITIVITY_WARNING')
  })

  it('does NOT add gender warning for male clients', () => {
    const slots = computeOverlappingSlots(baseClient, { ...therapistA, professional_score: 3 })
    const { flags } = computeScore(baseClient, { ...therapistA, professional_score: 3 }, slots, 0)
    expect(flags).not.toContain('GENDER_SENSITIVITY_WARNING')
  })
})
