import type { ClientUpdate } from '@/lib/types/client'

const sel = (v: FormDataEntryValue | null): string | null =>
  v && v !== 'none' ? String(v) : null

const txt = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

// Extracts the structured clinical-profile fields from a client form submission.
// Shared by the create and edit client actions.
export function parseClinicalFields(fd: FormData): Partial<ClientUpdate> {
  const behaviors = fd.getAll('behaviors').map(String).filter(Boolean)
  return {
    behaviors: behaviors.length ? behaviors : null,
    behavior_severity: sel(fd.get('behavior_severity')),
    communication_type: sel(fd.get('communication_type')),
    receptive_language: sel(fd.get('receptive_language')),
    expressive_language: sel(fd.get('expressive_language')),
    socialization: sel(fd.get('socialization')),
    physical_contact_needs: sel(fd.get('physical_contact_needs')),
    client_size: sel(fd.get('client_size')),
    potty_training: sel(fd.get('potty_training')),
    triggers: txt(fd.get('triggers')),
    languages_at_home: txt(fd.get('languages_at_home')),
    parent_involvement: txt(fd.get('parent_involvement')),
    strengths: txt(fd.get('strengths')),
    limitations: txt(fd.get('limitations')),
  }
}
