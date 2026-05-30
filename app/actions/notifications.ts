'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Notification = {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

export async function getMyNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as unknown as Notification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notifications').update({ read: true } as never).eq('id', id)
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('user_id', userId)
    .eq('read', false)
  revalidatePath('/notifications')
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count ?? 0
}

