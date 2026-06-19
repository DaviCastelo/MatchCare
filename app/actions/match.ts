'use server'

import { createAdminClient } from '@/lib/supabase/server'
import {
  findEligibleTherapists,
  generateMultiTherapistSchedule,
  computeOverlappingSlots,
} from '@/lib/matching/engine'
import { createSessions } from './sessions'
import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { MatchOutput, MatchResult, ScheduleResult } from '@/lib/types/matching'

export async function runMatch(clientId: string): Promise<MatchOutput> {
  const supabase = createAdminClient()

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*, availability:client_availability(*)')
    .eq('id', clientId)
    .single()
  if (clientErr || !client) throw new Error('Client not found')

  const { data: therapists, error: therapistErr } = await supabase
    .from('therapists')
    .select(
      '*, profile:profiles(full_name, preferred_language, approved), availability:therapist_availability(*)'
    )
  if (therapistErr) throw new Error('Failed to load therapists')

  // Sum existing active sessions per therapist to get current weekly hours
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('therapist_id, start_time, end_time')
    .eq('status', 'active')

  const therapistHoursMap: Record<string, number> = {}
  for (const s of activeSessions ?? []) {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
    therapistHoursMap[s.therapist_id] = (therapistHoursMap[s.therapist_id] ?? 0) + hours
  }

  // Keep only therapists with at least 3h remaining capacity (enough for one session)
  const WEEKLY_TARGET = 15
  const available = (therapists ?? []).filter(
    (t) => (WEEKLY_TARGET - (therapistHoursMap[t.id] ?? 0)) >= 3
  ) as Therapist[]

  return findEligibleTherapists(client as Client, available, therapistHoursMap)
}

// Called after the admin selects 2-3 therapists and clicks "Generate Schedule"
export async function getScheduleForTherapists(
  clientId: string,
  therapistIds: string[]
): Promise<ScheduleResult> {
  if (therapistIds.length < 2 || therapistIds.length > 3) {
    return { ok: false, reason: 'min_therapist_count_not_met' }
  }

  const supabase = createAdminClient()

  const [{ data: client }, { data: therapistsRaw }, { data: activeSessions }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, availability:client_availability(*)')
      .eq('id', clientId)
      .single(),
    supabase
      .from('therapists')
      .select(
        '*, profile:profiles(full_name, preferred_language, approved), availability:therapist_availability(*)'
      )
      .in('id', therapistIds),
    supabase
      .from('sessions')
      .select('therapist_id, start_time, end_time')
      .eq('status', 'active'),
  ])

  if (!client || !therapistsRaw) return { ok: false, reason: 'no_valid_slots' }

  const therapistHoursMap: Record<string, number> = {}
  for (const s of activeSessions ?? []) {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
    therapistHoursMap[s.therapist_id] = (therapistHoursMap[s.therapist_id] ?? 0) + hours
  }

  // Build MatchResult objects for the selected therapists (preserve selection order)
  const selectedResults: MatchResult[] = therapistIds.flatMap((id) => {
    const therapist = (therapistsRaw as Therapist[]).find((t) => t.id === id)
    if (!therapist) return []
    const overlappingSlots = computeOverlappingSlots(client as Client, therapist)
    return [{
      therapist,
      score: 0,
      overlappingSlots,
      flags: [],
      currentWeeklyHours: therapistHoursMap[id] ?? 0,
    }]
  })

  return generateMultiTherapistSchedule(selectedResults)
}

export async function confirmMatch(clientId: string, scheduleResult: ScheduleResult) {
  if (!scheduleResult.ok) throw new Error('Invalid schedule')

  const supabase = createAdminClient()
  const { assignments } = scheduleResult.schedule

  const { data: client } = await supabase
    .from('clients')
    .select('preferred_session_location')
    .eq('id', clientId)
    .single()

  const location = client?.preferred_session_location ?? 'Clinic'
  const today = new Date().toISOString().split('T')[0]

  // Optimistic lock: check for conflicts across all therapists before inserting anything
  for (const assignment of assignments) {
    const { data: existing } = await supabase
      .from('sessions')
      .select('day_of_week, start_time, end_time')
      .eq('therapist_id', assignment.therapist.id)
      .eq('status', 'active')

    for (const proposed of assignment.slots) {
      const conflict = (existing ?? []).some(
        (s) =>
          s.day_of_week === proposed.day_of_week &&
          s.start_time < proposed.end_time &&
          s.end_time > proposed.start_time
      )
      if (conflict) throw new Error('CONFLICT')
    }
  }

  // Create one client_therapist_assignment + sessions per therapist
  for (const assignment of assignments) {
    const { data: record, error: assignErr } = await supabase
      .from('client_therapist_assignments')
      .insert({
        client_id: clientId,
        therapist_id: assignment.therapist.id,
        sessions_per_week: assignment.slots.length,
        status: 'active',
      })
      .select('id')
      .single()

    if (assignErr || !record) throw new Error('Failed to create assignment')

    await createSessions(
      assignment.slots.map((slot) => ({
        client_id: clientId,
        therapist_id: assignment.therapist.id,
        assignment_id: record.id,
        location,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'active' as const,
        recurrence_start: today,
      }))
    )
  }
}
