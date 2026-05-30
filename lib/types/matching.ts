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
}

export type DisqualifiedEntry = {
  therapist: Therapist
  failedRule: MatchRuleName
}

export type MatchOutput = {
  eligible: MatchResult[]
  disqualified: DisqualifiedEntry[]
}

export type ScheduleResult =
  | { ok: true; schedule: WeeklySchedule }
  | { ok: false; reason: 'insufficient_hours' | 'no_valid_slots' | 'clinic_hours_conflict' }
