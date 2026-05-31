'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateSessionInput, toValidationInput } from '@/lib/sessions/validation'
import type {
  Session,
  SessionInsert,
  CalendarSession,
  AdminSessionFilters,
  AdminSessionRow,
} from '@/lib/types/session'

const CALENDAR_SELECT = `
  *,
  client:clients(id, full_name, age, parent_phone, city, preferred_session_location, notes, language),
  therapist:therapists(id, email, phone, city, years_of_experience, language, profile:profiles(full_name)),
  exceptions:session_exceptions(*)
`

const ADMIN_SELECT = `
  *,
  client:clients(id, full_name, age, parent_phone, city, preferred_session_location, notes, language),
  therapist:therapists(id, email, phone, city, years_of_experience, language, profile:profiles(full_name)),
  exceptions:session_exceptions(*)
`

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Unauthorized')
  return user
}

function applyAdminFilters(
  sessions: AdminSessionRow[],
  filters: AdminSessionFilters,
  perspective: 'client' | 'therapist'
): AdminSessionRow[] {
  return sessions.filter((session) => {
    if (filters.status && session.status !== filters.status) return false
    if (filters.location && session.location !== filters.location) return false
    if (filters.day_of_week !== undefined && session.day_of_week !== filters.day_of_week) return false

    if (filters.city) {
      const city =
        perspective === 'client'
          ? session.client?.city
          : session.therapist?.city
      if (!city?.toLowerCase().includes(filters.city.toLowerCase())) return false
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      const clientName = session.client?.full_name?.toLowerCase() ?? ''
      const therapistName = session.therapist?.profile?.full_name?.toLowerCase() ?? ''
      if (!clientName.includes(q) && !therapistName.includes(q)) return false
    }

    if (filters.dateFrom) {
      const end = session.recurrence_end ?? '9999-12-31'
      if (end < filters.dateFrom) return false
    }

    if (filters.dateTo) {
      if (session.recurrence_start > filters.dateTo) return false
    }

    return true
  })
}

export async function getAllSessions(): Promise<Session[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      client:clients(full_name, city),
      therapist:therapists(email, city, profile:profiles(full_name))
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Session[]
}

export async function getMySessions(): Promise<Session[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()

  if (profile?.role === 'therapist') {
    const { data, error } = await adminClient
      .from('sessions')
      .select('*, client:clients(full_name, city), exceptions:session_exceptions(*)')
      .eq('therapist_id', user.id)
      .eq('status', 'active')
    if (error) throw error
    return (data ?? []) as unknown as Session[]
  }

  const { data: client } = await adminClient
    .from('clients')
    .select('id, full_name')
    .eq('parent_id', user.id)
    .single()

  if (!client) return []

  const { data, error } = await adminClient
    .from('sessions')
    .select('*, therapist:therapists(email, profile:profiles(full_name)), exceptions:session_exceptions(*)')
    .eq('client_id', client.id)
    .eq('status', 'active')
  if (error) throw error
  return (data ?? []) as unknown as Session[]
}

export async function getMySessionsForCalendar(): Promise<CalendarSession[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()

  if (profile?.role === 'therapist') {
    const { data, error } = await adminClient
      .from('sessions')
      .select(CALENDAR_SELECT)
      .eq('therapist_id', user.id)
      .neq('status', 'cancelled')
    if (error) throw error
    return (data ?? []) as unknown as CalendarSession[]
  }

  const { data: client } = await adminClient
    .from('clients')
    .select('id')
    .eq('parent_id', user.id)
    .single()

  if (!client) return []

  const { data, error } = await adminClient
    .from('sessions')
    .select(CALENDAR_SELECT)
    .eq('client_id', client.id)
    .neq('status', 'cancelled')
  if (error) throw error
  return (data ?? []) as unknown as CalendarSession[]
}

export async function getAdminSessionsByClient(
  filters: AdminSessionFilters = {}
): Promise<AdminSessionRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select(ADMIN_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return applyAdminFilters((data ?? []) as unknown as AdminSessionRow[], filters, 'client')
}

export async function getAdminSessionsByTherapist(
  filters: AdminSessionFilters = {}
): Promise<AdminSessionRow[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select(ADMIN_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return applyAdminFilters((data ?? []) as unknown as AdminSessionRow[], filters, 'therapist')
}

async function fetchExistingSlots(excludeSessionId?: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, client_id, therapist_id, day_of_week, start_time, end_time, status')
  if (error) throw error
  return ((data ?? []) as ExistingSessionSlot[]).filter((s) => s.id !== excludeSessionId)
}

type ExistingSessionSlot = {
  id: string
  client_id: string
  therapist_id: string
  day_of_week: number
  start_time: string
  end_time: string
  status: string
}

async function fetchCities(clientId: string, therapistId: string) {
  const supabase = createAdminClient()
  const [{ data: client }, { data: therapist }] = await Promise.all([
    supabase.from('clients').select('city').eq('id', clientId).single(),
    supabase.from('therapists').select('city').eq('id', therapistId).single(),
  ])
  return {
    clientCity: (client as { city?: string } | null)?.city,
    therapistCity: (therapist as { city?: string } | null)?.city,
  }
}

export async function createSession(
  data: SessionInsert
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  await requireAdmin()
  const { clientCity, therapistCity } = await fetchCities(data.client_id, data.therapist_id)
  const existing = await fetchExistingSlots()
  const validation = validateSessionInput(
    toValidationInput(data, clientCity, therapistCity),
    existing
  )
  if (!validation.ok) return validation

  const supabase = createAdminClient()
  const { data: created, error } = await supabase
    .from('sessions')
    .insert({ ...data, status: data.status ?? 'active' } as never)
    .select()
    .single()
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/sessions')
  revalidatePath('/parent/schedule')
  revalidatePath('/therapist/schedule')
  return { ok: true, session: created as unknown as Session }
}

export async function updateSession(
  id: string,
  data: Partial<SessionInsert>
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: current, error: fetchError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !current) return { ok: false, error: 'Session not found' }

  const merged = { ...(current as SessionInsert), ...data, id } as SessionInsert & { id: string }
  const { clientCity, therapistCity } = await fetchCities(merged.client_id, merged.therapist_id)
  const existing = await fetchExistingSlots(id)
  const validation = validateSessionInput(
    toValidationInput(merged, clientCity, therapistCity),
    existing,
    id
  )
  if (!validation.ok) return validation

  const { error } = await supabase
    .from('sessions')
    .update(data as never)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/sessions')
  revalidatePath('/parent/schedule')
  revalidatePath('/therapist/schedule')
  return { ok: true }
}

export async function deleteSession(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled' } as never)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/sessions')
  revalidatePath('/parent/schedule')
  revalidatePath('/therapist/schedule')
  return { ok: true }
}

export async function createSessions(sessions: SessionInsert[]): Promise<Session[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('sessions').insert(sessions as never[]).select()
  if (error) throw error
  const created = (data ?? []) as unknown as Session[]

  for (const session of created) {
    const { data: client } = await supabase
      .from('clients')
      .select('parent_id')
      .eq('id', session.client_id)
      .single()

    const notifications: never[] = [
      {
        user_id: session.therapist_id,
        type: 'match_assigned',
        payload: { session_id: session.id, client_id: session.client_id },
      } as never,
    ]

    if ((client as { parent_id?: string } | null)?.parent_id) {
      notifications.push({
        user_id: (client as { parent_id: string }).parent_id,
        type: 'match_assigned',
        payload: { session_id: session.id },
      } as never)
    }

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/admin/sessions')
  return created
}

export async function cancelSessionDate(
  sessionId: string,
  exceptionDate: string,
  reason: string,
  requestedBy: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('session_exceptions').insert({
    session_id: sessionId,
    exception_date: exceptionDate,
    type: 'cancellation',
    reason,
    requested_by: requestedBy,
  } as never)

  const { data: session } = await supabase
    .from('sessions')
    .select('therapist_id, client_id')
    .eq('id', sessionId)
    .single()

  if (session) {
    await supabase.from('notifications').insert({
      user_id: (session as { therapist_id: string }).therapist_id,
      type: 'session_cancelled',
      payload: { session_id: sessionId, date: exceptionDate, reason },
    } as never)
  }

  revalidatePath('/parent/schedule')
  revalidatePath('/therapist/schedule')
}

export async function createChangeRequest(
  sessionId: string,
  reason: string,
  notes: string,
  requestedBy: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('session_change_requests').insert({
    session_id: sessionId,
    reason,
    requested_by: requestedBy,
    notes,
    status: 'pending',
  } as never)
  if (error) throw error

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins) {
    await supabase.from('notifications').insert(
      (admins as { id: string }[]).map((a) => ({
        user_id: a.id,
        type: 'schedule_changed',
        payload: { session_id: sessionId, reason, requested_by: requestedBy },
      })) as never[]
    )
  }

  revalidatePath('/admin/schedule-change')
}

export async function getClientsAndTherapistsForSessionForm() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: clients }, { data: therapists }] = await Promise.all([
    supabase.from('clients').select('id, full_name, city').order('full_name'),
    supabase
      .from('therapists')
      .select('id, email, city, profile:profiles(full_name, approved)')
      .order('email'),
  ])

  const approvedTherapists = ((therapists ?? []) as unknown as Array<{
    id: string
    email: string
    city: string
    profile?: { full_name: string; approved: boolean } | null
  }>).filter((t) => t.profile?.approved)

  return {
    clients: (clients ?? []) as { id: string; full_name: string; city: string }[],
    therapists: approvedTherapists.map((t) => ({
      id: t.id,
      name: t.profile?.full_name ?? t.email,
      city: t.city,
    })),
  }
}
