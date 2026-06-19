import type { Database } from './database'

export type Therapist = Database['public']['Tables']['therapists']['Row'] & {
  profile?: {
    full_name: string
    preferred_language: string
    approved: boolean
    avatar_url?: string | null
  }
  availability?: TherapistSlot[]
}

export type TherapistSlot = Database['public']['Tables']['therapist_availability']['Row']

export type TherapistInsert = Database['public']['Tables']['therapists']['Insert']
export type TherapistUpdate = Database['public']['Tables']['therapists']['Update']
