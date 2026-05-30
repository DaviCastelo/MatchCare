'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  if (!authData.user) return { error: 'Login failed' }

  // Role is stored in user_metadata at signup — no DB query needed
  const role = (authData.user.user_metadata?.role ?? 'parent') as string

  if (role === 'admin') redirect('/en/admin/dashboard')
  if (role === 'therapist') redirect('/en/therapist/schedule')
  redirect('/en/parent/schedule')
}

export async function register(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as 'therapist' | 'parent'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Registration failed' }

  if (role === 'therapist') {
    await adminClient.from('therapists').insert({
      id: data.user.id,
      email,
      phone: '',
      years_of_experience: 0,
      professional_score: 1,
      city: '',
      language: 'en',
    } as never)

    await adminClient.from('therapist_approval_requests').insert({
      therapist_id: data.user.id,
      status: 'pending',
    } as never)
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/en/login')
}

