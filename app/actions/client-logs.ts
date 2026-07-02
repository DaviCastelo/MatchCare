'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ParentTrainingEntry,
  ParentTrainingInsert,
  EligibilityCheck,
  EligibilityCheckInsert,
} from '@/lib/types/client'

// ── Parent-training monthly log ──────────────────────────────────────────────

export async function getParentTrainingLog(clientId: string): Promise<ParentTrainingEntry[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('parent_training_log')
    .select('*')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as ParentTrainingEntry[]
}

export async function addParentTrainingEntry(
  clientId: string,
  entry: Omit<ParentTrainingInsert, 'client_id'>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('parent_training_log')
    .insert({ ...entry, client_id: clientId } as never)
  if (error) throw error
  revalidatePath(`/admin/clients/${clientId}`)
}

export async function deleteParentTrainingEntry(id: string, clientId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('parent_training_log').delete().eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/clients/${clientId}`)
}

// ── Eligibility re-verification log ──────────────────────────────────────────

export async function getEligibilityChecks(clientId: string): Promise<EligibilityCheck[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('eligibility_checks')
    .select('*')
    .eq('client_id', clientId)
    .order('check_month', { ascending: false })
  if (error) throw error
  return (data ?? []) as EligibilityCheck[]
}

export async function addEligibilityCheck(
  clientId: string,
  entry: Omit<EligibilityCheckInsert, 'client_id'>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('eligibility_checks')
    .insert({ ...entry, client_id: clientId } as never)
  if (error) throw error
  revalidatePath(`/admin/clients/${clientId}`)
}

export async function deleteEligibilityCheck(id: string, clientId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('eligibility_checks').delete().eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/clients/${clientId}`)
}
