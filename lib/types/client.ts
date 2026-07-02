import type { Database } from './database'

export type Client = Database['public']['Tables']['clients']['Row'] & {
  availability?: ClientSlot[]
}

export type ClientSlot = Database['public']['Tables']['client_availability']['Row']

export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export type ParentTrainingEntry = Database['public']['Tables']['parent_training_log']['Row']
export type ParentTrainingInsert = Database['public']['Tables']['parent_training_log']['Insert']
export type EligibilityCheck = Database['public']['Tables']['eligibility_checks']['Row']
export type EligibilityCheckInsert = Database['public']['Tables']['eligibility_checks']['Insert']
