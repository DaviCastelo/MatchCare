'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { findEligibleTherapists, generateWeeklySchedule } from '@/lib/matching/engine'
import { createSessions } from './sessions'
import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { MatchOutput, ScheduleResult } from '@/lib/types/matching'

export async function runMatch(clientId: string): Promise<MatchOutput> {
  const supabase = createAdminClient()

  // Load client with availability
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*, availability:client_availability(*)')
    .eq('id', clientId)
    .single()
  if (clientErr || !client) throw new Error('Client not found')

  // Load all therapists with availability
  const { data: therapists, error: therapistErr } = await supabase
    .from('therapists')
    .select('*, profile:profiles(full_name, preferred_language, approved), availability:therapist_availability(*)')
  if (therapistErr) throw new Error('Failed to load therapists')

  // Load active sessions to compute remaining weekly capacity per therapist
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('therapist_id, start_time, end_time')
    .eq('status', 'active')

  function getRemainingHours(therapistId: string): number {
    const WEEKLY_TARGET = 15
    const assigned = (activeSessions ?? [])
      .filter((s) => s.therapist_id === therapistId)
      .reduce((acc, s) => {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60
      }, 0)
    return WEEKLY_TARGET - assigned
  }

  // Filter therapists that have capacity for 12h more
  const available = (therapists ?? []).filter(
    (t) => getRemainingHours(t.id) >= 12
  ) as Therapist[]

  return findEligibleTherapists(client as Client, available)
}

export async function getScheduleForTherapist(
  clientId: string,
  therapistId: string
): Promise<ScheduleResult> {
  const supabase = createAdminClient()

  const [{ data: client }, { data: therapist }] = await Promise.all([
    supabase.from('clients').select('*, availability:client_availability(*)').eq('id', clientId).single(),
    supabase.from('therapists').select('*, availability:therapist_availability(*)').eq('id', therapistId).single(),
  ])

  if (!client || !therapist) return { ok: false, reason: 'no_valid_slots' }

  // Recompute overlapping slots
  const { computeOverlappingSlots } = await import('@/lib/matching/rules')
  const slots = computeOverlappingSlots(client as Client, therapist as Therapist)

  return generateWeeklySchedule(client as Client, therapist as Therapist, slots)
}

export async function confirmMatch(
  clientId: string,
  therapistId: string,
  scheduleResult: ScheduleResult
) {
  if (!scheduleResult.ok) throw new Error('Invalid schedule')

  const supabase = createAdminClient()

  // Optimistic lock: re-verify availability hasn't changed
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('day_of_week, start_time, end_time')
    .eq('therapist_id', therapistId)
    .eq('status', 'active')

  for (const proposed of scheduleResult.schedule) {
    const conflict = (existingSessions ?? []).some(
      (s) =>
        s.day_of_week === proposed.day_of_week &&
        s.start_time < proposed.end_time &&
        s.end_time > proposed.start_time
    )
    if (conflict) throw new Error('CONFLICT')
  }

  // Get client's session location preference
  const { data: client } = await supabase
    .from('clients')
    .select('preferred_session_location')
    .eq('id', clientId)
    .single()

  const today = new Date().toISOString().split('T')[0]

  await createSessions(
    scheduleResult.schedule.map((slot) => ({
      client_id: clientId,
      therapist_id: therapistId,
      location: client?.preferred_session_location ?? 'Clinic',
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: 'active' as const,
      recurrence_start: today,
    }))
  )
}

