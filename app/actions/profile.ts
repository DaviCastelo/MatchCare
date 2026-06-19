'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

// Uploads the current user's profile photo to the public `avatars` bucket and
// stores its URL on profiles.avatar_url. Writes go through the service-role
// admin client (bypasses storage RLS); reads are public via the bucket.
export async function uploadAvatar(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return
  if (file.size > MAX_BYTES) throw new Error('Image too large (max 5 MB)')
  if (!ALLOWED.includes(file.type)) throw new Error('Unsupported image type')

  const admin = createAdminClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { upsert: true, contentType: file.type })
  if (upErr) throw upErr

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
  // cache-bust so the new image shows immediately
  const url = `${publicUrl}?v=${Date.now()}`

  const { error: updErr } = await admin
    .from('profiles')
    .update({ avatar_url: url } as never)
    .eq('id', user.id)
  if (updErr) throw updErr

  revalidatePath('/therapist/profile')
  revalidatePath('/admin/therapists')
}
