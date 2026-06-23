import type { Client } from '@/lib/types/client'
import type { Therapist } from '@/lib/types/therapist'

export const LIST_PAGE_SIZE = 7

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export type ClientListFilters = {
  q?: string
  sex?: string
  location?: string
  language?: string
  city?: string
  state?: string
  zip?: string
}

export type TherapistListFilters = {
  q?: string
  sex?: string
  language?: string
  city?: string
  state?: string
  zip?: string
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function matchesText(q: string, ...values: (string | number | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return values.some((v) => v != null && String(v).toLowerCase().includes(needle))
}

function availabilityText(
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }> | undefined
): string {
  if (!slots?.length) return ''
  return slots
    .map((s) => `${DAYS[s.day_of_week] ?? s.day_of_week} ${s.start_time}-${s.end_time}`)
    .join(' ')
}

export function filterClients(clients: Client[], filters: ClientListFilters): Client[] {
  return clients.filter((client) => {
    if (filters.sex && filters.sex !== 'all' && client.sex !== filters.sex) return false
    if (filters.location && filters.location !== 'all' && client.preferred_session_location !== filters.location)
      return false
    if (filters.language && !includes(client.language, filters.language)) return false
    if (filters.city && !includes(client.city, filters.city)) return false
    if (filters.state && !includes(client.state ?? '', filters.state)) return false
    if (filters.zip && !includes(client.zip_code ?? '', filters.zip)) return false

    if (filters.q?.trim()) {
      const slots = availabilityText(client.availability)
      if (
        !matchesText(
          filters.q,
          client.full_name,
          client.parent_phone,
          client.behavior_score,
          client.score_description,
          client.age,
          client.sex,
          client.language,
          client.city,
          client.street_address,
          client.state,
          client.zip_code,
          client.school_zip_code,
          client.preferred_session_location,
          client.weekly_hours,
          client.health_insurance,
          client.notes,
          client.id,
          client.created_at,
          slots
        )
      ) {
        return false
      }
    }

    return true
  })
}

export function filterTherapists(therapists: Therapist[], filters: TherapistListFilters): Therapist[] {
  return therapists.filter((therapist) => {
    if (filters.sex === 'unset' && therapist.sex != null) return false
    if (filters.sex && filters.sex !== 'all' && filters.sex !== 'unset' && therapist.sex !== filters.sex)
      return false
    if (filters.language && !includes(therapist.language, filters.language)) return false
    if (filters.city && !includes(therapist.city, filters.city)) return false
    if (filters.state && !includes(therapist.state ?? '', filters.state)) return false
    if (filters.zip && !includes(therapist.zip_code ?? '', filters.zip)) return false

    if (filters.q?.trim()) {
      const slots = availabilityText(therapist.availability)
      if (
        !matchesText(
          filters.q,
          therapist.profile?.full_name,
          therapist.email,
          therapist.phone,
          therapist.years_of_experience,
          therapist.professional_score,
          therapist.sex,
          therapist.city,
          therapist.street_address,
          therapist.state,
          therapist.zip_code,
          therapist.language,
          therapist.last_score_review_date,
          therapist.score_reviewer_supervisor,
          therapist.notes,
          therapist.profile?.preferred_language,
          therapist.id,
          therapist.created_at,
          slots
        )
      ) {
        return false
      }
    }

    return true
  })
}

export function paginate<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}
