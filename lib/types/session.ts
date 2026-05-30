import type { Database } from './database'

export type Session = Database['public']['Tables']['sessions']['Row'] & {
  client?: { full_name: string; city: string }
  therapist?: { email: string; city: string; profile?: { full_name: string } }
}

export type SessionException = Database['public']['Tables']['session_exceptions']['Row']
export type SessionChangeRequest = Database['public']['Tables']['session_change_requests']['Row']
export type SessionInsert = {
  client_id: string
  therapist_id: string
  location: 'Clinic' | 'School' | 'Home'
  day_of_week: number
  start_time: string
  end_time: string
  status?: 'active' | 'cancelled' | 'rescheduled'
  recurrence_start: string
  recurrence_end?: string | null
  change_reason?: 'parent_complaint' | 'therapist_resignation' | 'new_client' | 'availability_change' | null
  changed_at?: string | null
  changed_by?: string | null
}
