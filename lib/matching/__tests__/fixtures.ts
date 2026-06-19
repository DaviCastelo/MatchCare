import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { MatchResult } from '@/lib/types/matching'

// ─── Client ───────────────────────────────────────────────────────────────────
// Available Mon–Fri 09:00–17:00 (8h/day × 5 days = 40h raw overlap possible)
export const baseClient: Client = {
  id: 'client-1',
  parent_id: null,
  full_name: 'Lucas Silva',
  parent_phone: '11999999999',
  behavior_score: 6,
  score_description: 'moderate',
  age: 7,
  sex: 'Male',
  language: 'pt-BR',
  city: 'São Paulo',
  preferred_session_location: 'Clinic',
  weekly_hours: 12,
  health_insurance: null,
  notes: null,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  availability: [
    { id: 'ca-1', client_id: 'client-1', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { id: 'ca-2', client_id: 'client-1', day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    { id: 'ca-3', client_id: 'client-1', day_of_week: 3, start_time: '09:00', end_time: '17:00' },
    { id: 'ca-4', client_id: 'client-1', day_of_week: 4, start_time: '09:00', end_time: '17:00' },
    { id: 'ca-5', client_id: 'client-1', day_of_week: 5, start_time: '09:00', end_time: '17:00' },
  ],
}

// ─── Therapist A ──────────────────────────────────────────────────────────────
// Available Mon + Wed 09:00–17:00 → overlaps client on Mon + Wed
// Same city, same language → highest soft score possible
export const therapistA: Therapist = {
  id: 'therapist-A',
  email: 'ana@clinic.com',
  phone: '11888881111',
  years_of_experience: 5,
  professional_score: 6,
  city: 'São Paulo',
  language: 'pt-BR',
  last_score_review_date: null,
  score_reviewer_supervisor: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  profile: { full_name: 'Ana Costa', preferred_language: 'pt-BR', approved: true },
  availability: [
    { id: 'ta-1', therapist_id: 'therapist-A', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { id: 'ta-2', therapist_id: 'therapist-A', day_of_week: 3, start_time: '09:00', end_time: '17:00' },
  ],
}

// ─── Therapist B ──────────────────────────────────────────────────────────────
// Available Tue + Thu 09:00–17:00 → overlaps client on Tue + Thu
// Same city, same language — but already has 12h this week
export const therapistB: Therapist = {
  id: 'therapist-B',
  email: 'bruno@clinic.com',
  phone: '11888882222',
  years_of_experience: 3,
  professional_score: 6,
  city: 'São Paulo',
  language: 'pt-BR',
  last_score_review_date: null,
  score_reviewer_supervisor: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  profile: { full_name: 'Bruno Lima', preferred_language: 'pt-BR', approved: true },
  availability: [
    { id: 'tb-1', therapist_id: 'therapist-B', day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    { id: 'tb-2', therapist_id: 'therapist-B', day_of_week: 4, start_time: '09:00', end_time: '17:00' },
  ],
}

// ─── Therapist C ──────────────────────────────────────────────────────────────
// Available Mon + Fri 09:00–17:00
// Different city (disqualified for Home sessions, but eligible for Clinic)
export const therapistC: Therapist = {
  id: 'therapist-C',
  email: 'carla@clinic.com',
  phone: '11888883333',
  years_of_experience: 7,
  professional_score: 7,
  city: 'Campinas',
  language: 'pt-BR',
  last_score_review_date: null,
  score_reviewer_supervisor: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  profile: { full_name: 'Carla Mendes', preferred_language: 'pt-BR', approved: true },
  availability: [
    { id: 'tc-1', therapist_id: 'therapist-C', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { id: 'tc-2', therapist_id: 'therapist-C', day_of_week: 5, start_time: '09:00', end_time: '17:00' },
  ],
}

// ─── Therapist D (disqualified — score incompatibility) ──────────────────────
// professional_score = 8 but client behavior_score = 6
// Rule: if therapist.professional_score >= 5, client.behavior_score must be >= 5 → passes
// Actually let's make score mismatch: therapist.professional_score < 5 and client.behavior_score >= 5
export const therapistDisqualified: Therapist = {
  id: 'therapist-D',
  email: 'disq@clinic.com',
  phone: '11888884444',
  years_of_experience: 1,
  professional_score: 3, // < 5, but client behavior_score = 6 > 5 → DISQUALIFIED
  city: 'São Paulo',
  language: 'pt-BR',
  last_score_review_date: null,
  score_reviewer_supervisor: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  profile: { full_name: 'Daniel Rocha', preferred_language: 'pt-BR', approved: true },
  availability: [
    { id: 'td-1', therapist_id: 'therapist-D', day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { id: 'td-2', therapist_id: 'therapist-D', day_of_week: 2, start_time: '09:00', end_time: '17:00' },
  ],
}

// ─── Therapist with minimal overlap (< 3h — disqualified) ─────────────────────
export const therapistTooLittleOverlap: Therapist = {
  id: 'therapist-E',
  email: 'elisa@clinic.com',
  phone: '11888885555',
  years_of_experience: 2,
  professional_score: 6,
  city: 'São Paulo',
  language: 'pt-BR',
  last_score_review_date: null,
  score_reviewer_supervisor: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  profile: { full_name: 'Elisa Faria', preferred_language: 'pt-BR', approved: true },
  availability: [
    // Only Mon 09:00–10:30 → 1.5h overlap → below 3h threshold
    { id: 'te-1', therapist_id: 'therapist-E', day_of_week: 1, start_time: '09:00', end_time: '10:30' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Build a MatchResult for a therapist (simulates what findEligibleTherapists returns)
export function makeMatchResult(
  therapist: Therapist,
  currentWeeklyHours: number,
  overlappingSlots = therapist.availability ?? []
): MatchResult {
  return {
    therapist,
    score: 0,
    overlappingSlots: overlappingSlots.map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    })),
    flags: [],
    currentWeeklyHours,
  }
}
