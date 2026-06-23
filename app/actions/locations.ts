'use server'

import { createAdminClient } from '@/lib/supabase/server'

// Resolve a 5-digit ZIP to its city/state from the zip_codes reference table.
// Used by the address form to auto-fill city + state when a ZIP is typed.
export async function lookupZip(
  zip: string
): Promise<{ city: string | null; state: string | null } | null> {
  const z = (zip ?? '').trim()
  if (!/^\d{5}$/.test(z)) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('zip_codes')
    .select('city, state')
    .eq('zip', z)
    .maybeSingle()
  return data ?? null
}

// Distinct states for the State dropdown (read from the zip_code_states view —
// ~50 rows, cheap). Nationwide-safe: no full-table scan per form load.
export async function getStates(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('zip_code_states').select('state')
  return (data ?? [])
    .map((r) => r.state as string | null)
    .filter((s): s is string => !!s)
    .sort()
}

// Distinct cities for one state, for the City typeable dropdown (<datalist>).
// Scoped by state so we never ship the full ~19k-city nationwide list.
export async function getCitiesForState(state: string): Promise<string[]> {
  const s = (state ?? '').trim()
  if (!s) return []
  const supabase = createAdminClient()
  const { data } = await supabase.from('zip_codes').select('city').eq('state', s)
  const cities = new Set<string>()
  for (const r of data ?? []) if (r.city) cities.add(r.city)
  return [...cities].sort()
}
