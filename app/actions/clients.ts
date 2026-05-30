'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Client, ClientInsert, ClientUpdate } from '@/lib/types/client'

export async function getClients(): Promise<Client[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, availability:client_availability(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Client[]
}

export async function getClient(id: string): Promise<Client> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, availability:client_availability(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Client
}

export async function createClient(input: ClientInsert): Promise<Client> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(input as never)
    .select()
    .single()
  if (error) throw error
  revalidatePath('/admin/clients')
  return data as Client
}

export async function updateClient(id: string, input: ClientUpdate): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update(input as never)
    .eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/clients/${id}`)
  revalidatePath('/admin/clients')
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/clients')
}

export async function upsertClientAvailability(
  clientId: string,
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('client_availability').delete().eq('client_id', clientId)
  if (slots.length > 0) {
    const { error } = await supabase.from('client_availability').insert(
      slots.map((s) => ({ ...s, client_id: clientId })) as never[]
    )
    if (error) throw error
  }
  revalidatePath(`/admin/clients/${clientId}`)
}

