'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Session, SessionInsert } from '@/lib/types/session'

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

