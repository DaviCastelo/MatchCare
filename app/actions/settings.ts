'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveUserSettings(language: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  await admin
    .from('profiles')
    .update({ preferred_language: language } as never)
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}

export async function getUserSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { preferred_language: 'en' }

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('preferred_language, role')
    .eq('id', user.id)
    .single()

  return {
    preferred_language: (data as { preferred_language: string } | null)?.preferred_language ?? 'en',
    role: (data as { role: string } | null)?.role ?? 'parent',
  }
}
