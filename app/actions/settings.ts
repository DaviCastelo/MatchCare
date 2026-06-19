'use server'

import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LOCALE_COOKIE, localeCookieOptions, resolveLocale } from '@/lib/i18n/locale'

export async function saveUserSettings(language: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const locale = resolveLocale(language)

  const admin = createAdminClient()
  await admin
    .from('profiles')
    .update({ preferred_language: locale } as never)
    .eq('id', user.id)

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, localeCookieOptions())

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
