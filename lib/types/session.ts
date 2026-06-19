import type { Database } from './database'

export type SessionException = Database['public']['Tables']['session_exceptions']['Row']

export type SessionTherapistDetail = {
  id: string
  email: string
  phone: string
  city: string
  years_of_experience: number
  language: string
  profile?: { full_name: string }
}

export type SessionClientDetail = {
  id: string
  full_name: string
  age: number
  parent_phone: string
  city: string
  preferred_session_location: 'Clinic' | 'School' | 'Home'
  notes: string | null
  language: string
}

export type Session = Database['public']['Tables']['sessions']['Row'] & {
  client?: { full_name: string; city: string }
  therapist?: { email: string; city: string; profile?: { full_name: string } }
  exceptions?: SessionException[]
}

export type CalendarSession = Database['public']['Tables']['sessions']['Row'] & {
  client?: SessionClientDetail
  therapist?: SessionTherapistDetail
  exceptions?: SessionException[]
}

export type SessionChangeRequest = Database['public']['Tables']['session_change_requests']['Row']

export type SessionInsert = {
  client_id: string
  therapist_id: string
  assignment_id?: string | null
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

export type AdminSessionFilters = {
  search?: string
  day_of_week?: number
  status?: 'active' | 'cancelled' | 'rescheduled'
  location?: 'Clinic' | 'School' | 'Home'
  city?: string
  dateFrom?: string
  dateTo?: string
}

export type AdminSessionRow = Session & {
  client?: SessionClientDetail
  therapist?: SessionTherapistDetail
}
