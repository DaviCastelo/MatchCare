'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Therapist, TherapistUpdate } from '@/lib/types/therapist'

export async function getTherapists(): Promise<Therapist[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('therapists')
    .select('*, profile:profiles(full_name, preferred_language, approved), availability:therapist_availability(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Therapist[]
}

export async function getTherapist(id: string): Promise<Therapist> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('therapists')
    .select('*, profile:profiles(full_name, preferred_language, approved), availability:therapist_availability(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Therapist
}

export async function updateTherapist(id: string, input: TherapistUpdate): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('therapists').update(input as never).eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/therapists/${id}`)
  revalidatePath('/admin/therapists')
}

export async function approveTherapist(therapistId: string, adminId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('profiles').update({ approved: true } as never).eq('id', therapistId)
  await supabase
    .from('therapist_approval_requests')
    .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() } as never)
    .eq('therapist_id', therapistId)
    .eq('status', 'pending')
  await supabase.from('notifications').insert({
    user_id: therapistId,
    type: 'approval_result',
    payload: { approved: true },
  } as never)
  revalidatePath('/admin/therapists')
}

export async function rejectTherapist(therapistId: string, adminId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('profiles').update({ approved: false } as never).eq('id', therapistId)
  await supabase
    .from('therapist_approval_requests')
    .update({ status: 'rejected', reviewed_by: adminId, reviewed_at: new Date().toISOString() } as never)
    .eq('therapist_id', therapistId)
    .eq('status', 'pending')
  await supabase.from('notifications').insert({
    user_id: therapistId,
    type: 'approval_result',
    payload: { approved: false },
  } as never)
  revalidatePath('/admin/therapists')
}

export async function upsertTherapistAvailability(
  therapistId: string,
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('therapist_availability').delete().eq('therapist_id', therapistId)
  if (slots.length > 0) {
    const { error } = await supabase.from('therapist_availability').insert(
      slots.map((s) => ({ ...s, therapist_id: therapistId })) as never[]
    )
    if (error) throw error
  }
  revalidatePath('/therapist/profile')
}

export async function getMyTherapistProfile(): Promise<Therapist> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('therapists')
    .select('*, profile:profiles(full_name, preferred_language), availability:therapist_availability(*)')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data as unknown as Therapist
}

export async function getPendingApprovals() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('therapist_approval_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

