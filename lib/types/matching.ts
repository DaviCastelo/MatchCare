import type { Therapist } from './therapist'

export type MatchRuleName = 'scoreCompatibility' | 'cityMatch' | 'availabilityOverlap'

export type MatchFlag = 'GENDER_SENSITIVITY_WARNING'

export type Slot = {
  day_of_week: number
  start_time: string
  end_time: string
}

export type WeeklySchedule = Slot[]

export type MatchResult = {
  therapist: Therapist
  score: number
  overlappingSlots: Slot[]
  flags: MatchFlag[]
  currentWeeklyHours: number // hours already scheduled across all clients this week
}

export type DisqualifiedEntry = {
  therapist: Therapist
  failedRule: MatchRuleName
}

export type MatchOutput = {
  eligible: MatchResult[]
  disqualified: DisqualifiedEntry[]
}

// One therapist's share of the client's weekly schedule
export type TherapistAssignment = {
  therapist: Therapist
  slots: Slot[]
  weeklyHours: number
}

// Full distributed schedule across 2-3 therapists
export type MultiTherapistSchedule = {
  assignments: TherapistAssignment[]
  totalWeeklyHours: number
}

export type ScheduleResult =
  | { ok: true; schedule: MultiTherapistSchedule }
  | {
      ok: false
      reason:
        | 'insufficient_hours'
        | 'no_valid_slots'
        | 'clinic_hours_conflict'
        | 'min_therapist_count_not_met'
        | 'therapist_capacity_exceeded'
        | 'too_many_therapists'
        | 'incompatible_weekly_hours'
    }
