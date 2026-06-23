'use server'

import { createAdminClient } from '@/lib/supabase/server'
import {
  findEligibleTherapists,
  generateMultiTherapistSchedule,
  computeOverlappingSlots,
  subtractBusySlots,
} from '@/lib/matching/engine'
import { createSessions } from './sessions'
import { CLINIC_ZIP } from '@/lib/matching/rules'
import { haversineMiles, type Coords } from '@/lib/matching/geo'
import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'
import type { MatchOutput, MatchResult, ScheduleResult, Slot } from '@/lib/types/matching'

// minutes since midnight, tolerant of 'HH:MM' and 'HH:MM:SS'
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Builds therapistId → already-booked time slots from active sessions.
function buildBusyMap(
  sessions: { therapist_id: string; day_of_week: number; start_time: string; end_time: string }[] | null
): Record<string, Slot[]> {
  const busy: Record<string, Slot[]> = {}
  for (const s of sessions ?? []) {
    ;(busy[s.therapist_id] ??= []).push({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    })
  }
  return busy
}

// Resolve the ZIP a therapist must travel to for this client's sessions.
function sessionLocationZip(client: Client): string | null {
  if (client.preferred_session_location === 'Home') return client.zip_code
  if (client.preferred_session_location === 'School') return client.school_zip_code ?? client.zip_code
  return CLINIC_ZIP
}

// therapistId → miles from the session location to the therapist's ZIP (null if unknown).
// Resilient: if the zip_codes table is missing/unseeded, every distance is null
// (therapists are still matched, just without a proximity bonus).
async function buildDistanceMap(
  supabase: ReturnType<typeof createAdminClient>,
  client: Client,
  therapists: Therapist[]
): Promise<Record<string, number | null>> {
  const originZip = sessionLocationZip(client)
  const zips = new Set<string>()
  if (originZip) zips.add(originZip)
  for (const t of therapists) if (t.zip_code) zips.add(t.zip_code)

  const coords: Record<string, Coords> = {}
  if (zips.size > 0) {
    const { data } = await supabase.from('zip_codes').select('zip, lat, lng').in('zip', [...zips])
    for (const row of data ?? []) coords[row.zip] = { lat: row.lat, lng: row.lng }
  }

  const origin = originZip ? coords[originZip] : undefined
  const map: Record<string, number | null> = {}
  for (const t of therapists) {
    const dest = t.zip_code ? coords[t.zip_code] : undefined
    map[t.id] = origin && dest ? haversineMiles(origin, dest) : null
  }
  return map
}

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
      '*, profile:profiles(full_name, preferred_language, approved, avatar_url), availability:therapist_availability(*)'
    )
  if (therapistErr) throw new Error('Failed to load therapists')

  // Existing active sessions: drive both weekly-hours and the busy-time map
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('therapist_id, day_of_week, start_time, end_time')
    .eq('status', 'active')

  const therapistHoursMap: Record<string, number> = {}
  for (const s of activeSessions ?? []) {
    therapistHoursMap[s.therapist_id] =
      (therapistHoursMap[s.therapist_id] ?? 0) + (toMinutes(s.end_time) - toMinutes(s.start_time)) / 60
  }
  const busyByTherapist = buildBusyMap(activeSessions)

  // Keep only therapists with at least 3h remaining capacity (enough for one session)
  const WEEKLY_TARGET = 15
  const available = (therapists ?? []).filter(
    (t) => (WEEKLY_TARGET - (therapistHoursMap[t.id] ?? 0)) >= 3
  ) as Therapist[]

  const distanceByTherapist = await buildDistanceMap(supabase, client as Client, available)

  return findEligibleTherapists(
    client as Client,
    available,
    therapistHoursMap,
    busyByTherapist,
    distanceByTherapist
  )
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
      .select('therapist_id, day_of_week, start_time, end_time')
      .eq('status', 'active'),
  ])

  if (!client || !therapistsRaw) return { ok: false, reason: 'no_valid_slots' }

  const therapistHoursMap: Record<string, number> = {}
  for (const s of activeSessions ?? []) {
    therapistHoursMap[s.therapist_id] =
      (therapistHoursMap[s.therapist_id] ?? 0) + (toMinutes(s.end_time) - toMinutes(s.start_time)) / 60
  }
  const busyByTherapist = buildBusyMap(activeSessions)

  // Build MatchResult objects for the selected therapists (preserve selection order)
  const selectedResults: MatchResult[] = therapistIds.flatMap((id) => {
    const therapist = (therapistsRaw as Therapist[]).find((t) => t.id === id)
    if (!therapist) return []
    // exclude times the therapist is already booked with other clients
    const overlappingSlots = subtractBusySlots(
      computeOverlappingSlots(client as Client, therapist),
      busyByTherapist[id] ?? []
    )
    return [{
      therapist,
      score: 0,
      overlappingSlots,
      flags: [],
      currentWeeklyHours: therapistHoursMap[id] ?? 0,
      distanceMiles: null,
    }]
  })

  const weeklyHours = (client as Client).weekly_hours ?? 12
  return generateMultiTherapistSchedule(selectedResults, weeklyHours)
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
          toMinutes(s.start_time) < toMinutes(proposed.end_time) &&
          toMinutes(s.end_time) > toMinutes(proposed.start_time)
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
