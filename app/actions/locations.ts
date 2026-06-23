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

// Distinct states and cities for the address dropdowns. Cheap (a few thousand
// rows); deduped in memory. Cities power a <datalist> (typeable dropdown).
export async function getLocationOptions(): Promise<{ states: string[]; cities: string[] }> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('zip_codes').select('city, state')
  const states = new Set<string>()
  const cities = new Set<string>()
  for (const r of data ?? []) {
    if (r.state) states.add(r.state)
    if (r.city) cities.add(r.city)
  }
  return {
    states: [...states].sort(),
    cities: [...cities].sort(),
  }
}
