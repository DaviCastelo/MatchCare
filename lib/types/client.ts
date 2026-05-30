import type { Database } from './database'

export type Client = Database['public']['Tables']['clients']['Row'] & {
  availability?: ClientSlot[]
}

export type ClientSlot = Database['public']['Tables']['client_availability']['Row']

export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
