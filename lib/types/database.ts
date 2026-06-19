export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'therapist' | 'parent'
          full_name: string
          preferred_language: string
          approved: boolean
          avatar_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      therapists: {
        Row: {
          id: string
          email: string
          phone: string
          years_of_experience: number
          professional_score: number
          city: string
          language: string
          last_score_review_date: string | null
          score_reviewer_supervisor: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['therapists']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['therapists']['Insert']>
      }
      clients: {
        Row: {
          id: string
          parent_id: string | null
          full_name: string
          parent_phone: string
          behavior_score: number
          score_description: string
          age: number
          sex: 'Male' | 'Female'
          language: string
          city: string
          preferred_session_location: 'Clinic' | 'School' | 'Home'
          weekly_hours: number
          health_insurance: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      therapist_availability: {
        Row: {
          id: string
          therapist_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: Omit<Database['public']['Tables']['therapist_availability']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['therapist_availability']['Insert']>
      }
      client_availability: {
        Row: {
          id: string
          client_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: Omit<Database['public']['Tables']['client_availability']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['client_availability']['Insert']>
      }
      client_therapist_assignments: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          sessions_per_week: number
          status: 'active' | 'ended'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['client_therapist_assignments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['client_therapist_assignments']['Insert']>
      }
      sessions: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          assignment_id: string | null
          location: 'Clinic' | 'School' | 'Home'
          day_of_week: number
          start_time: string
          end_time: string
          status: 'active' | 'cancelled' | 'rescheduled'
          recurrence_start: string
          recurrence_end: string | null
          change_reason: 'parent_complaint' | 'therapist_resignation' | 'new_client' | 'availability_change' | null
          changed_at: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>
      }
      session_exceptions: {
        Row: {
          id: string
          session_id: string
          exception_date: string
          type: 'cancellation' | 'reschedule'
          new_date: string | null
          new_start_time: string | null
          new_end_time: string | null
          reason: string
          requested_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['session_exceptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['session_exceptions']['Insert']>
      }
      session_change_requests: {
        Row: {
          id: string
          session_id: string
          reason: 'parent_complaint' | 'therapist_resignation' | 'new_client' | 'availability_change'
          requested_by: string
          reviewed_by: string | null
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
          reviewed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['session_change_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['session_change_requests']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      therapist_approval_requests: {
        Row: {
          id: string
          therapist_id: string
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['therapist_approval_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['therapist_approval_requests']['Insert']>
      }
    }
  }
}
