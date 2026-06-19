'use server'

import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  LOCALE_COOKIE,
  localeCookieOptions,
  resolveLocale,
  type AppLocale,
} from '@/lib/i18n/locale'

async function persistLocale(locale: AppLocale) {
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, localeCookieOptions())
}

function dashboardPath(locale: AppLocale, role: string): string {
  if (role === 'admin') return `/${locale}/admin/dashboard`
  if (role === 'therapist') return `/${locale}/therapist/schedule`
  return `/${locale}/parent/schedule`
}

export async function login(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const formLocale = formData.get('locale') as string | null
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  if (!authData.user) return { error: 'Login failed' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('preferred_language, role')
    .eq('id', authData.user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
    ?? (authData.user.user_metadata?.role as string | undefined)
    ?? 'parent'

  const locale = resolveLocale(
    (profile as { preferred_language?: string } | null)?.preferred_language,
    formLocale,
    cookieLocale
  )

  await persistLocale(locale)
  redirect(dashboardPath(locale, role))
}

export async function register(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as 'therapist' | 'parent'
  const formLocale = resolveLocale(formData.get('locale') as string | null)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Registration failed' }

  await adminClient
    .from('profiles')
    .update({ preferred_language: formLocale } as never)
    .eq('id', data.user.id)

  if (role === 'therapist') {
    await adminClient.from('therapists').insert({
      id: data.user.id,
      email,
      phone: '',
      years_of_experience: 0,
      professional_score: 1,
      city: '',
      language: formLocale,
    } as never)

    await adminClient.from('therapist_approval_requests').insert({
      therapist_id: data.user.id,
      status: 'pending',
    } as never)
  }

  await persistLocale(formLocale)
  return { success: true }
}

export async function logout(localeHint?: string) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value

  const { data: { user } } = await supabase.auth.getUser()

  let locale = resolveLocale(localeHint, cookieLocale)

  if (user) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single()

    locale = resolveLocale(
      (profile as { preferred_language?: string } | null)?.preferred_language,
      localeHint,
      cookieLocale
    )
  }

  await supabase.auth.signOut()
  await persistLocale(locale)
  redirect(`/${locale}/login`)
}
