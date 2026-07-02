import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const BEHAVIORS = ['Aggression', 'SIB', 'Elopement', 'Pica', 'Tantrums', 'Noncompliance', 'Crying']

const OPTIONS: Record<string, string[]> = {
  behavior_severity: ['Mild', 'Moderate', 'Severe'],
  communication_type: ['Verbal', 'Nonverbal', 'Hand-guiding', 'AAC device', 'Emerging', 'Limited'],
  receptive_language: ['Limited', 'Moderate', 'Strong', 'Emerging'],
  expressive_language: ['Limited', 'Moderate', 'Strong', 'Emerging'],
  socialization: ['Limited interest', 'Limited', 'Moderate', 'Strong'],
  physical_contact_needs: ['Low', 'Moderate', 'High'],
  client_size: ['Small', 'Average', 'Large'],
  potty_training: ['Trained', 'In progress', 'Not trained'],
}

function CatSelect({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value?: string | null
  options: string[]
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select name={name} defaultValue={value || 'none'}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export type ClinicalDefaults = {
  behaviors?: string[] | null
  behavior_severity?: string | null
  communication_type?: string | null
  receptive_language?: string | null
  expressive_language?: string | null
  socialization?: string | null
  physical_contact_needs?: string | null
  client_size?: string | null
  potty_training?: string | null
  triggers?: string | null
  languages_at_home?: string | null
  parent_involvement?: string | null
  strengths?: string | null
  limitations?: string | null
  park_consent?: boolean
  survey?: string | null
  parent_training_hours?: number | null
}

/**
 * Structured clinical-profile inputs for the client forms (replaces the free-text
 * blob the spreadsheet kept in one cell). All inputs carry `name` attributes and
 * submit with the surrounding <form>; parse them with parseClinicalFields().
 * Server component — Selects are uncontrolled (defaultValue).
 */
export function ClinicalProfileFields({ defaults = {} }: { defaults?: ClinicalDefaults }) {
  const d = defaults
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-2">
        <Label>Behaviors</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {BEHAVIORS.map((b) => (
            <label key={b} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                name="behaviors"
                value={b}
                defaultChecked={d.behaviors?.includes(b) ?? false}
                className="size-4 rounded border-gray-300"
              />
              {b}
            </label>
          ))}
        </div>
      </div>

      <CatSelect name="behavior_severity" label="Behavior severity" value={d.behavior_severity} options={OPTIONS.behavior_severity} />
      <CatSelect name="communication_type" label="Communication" value={d.communication_type} options={OPTIONS.communication_type} />
      <CatSelect name="receptive_language" label="Receptive language" value={d.receptive_language} options={OPTIONS.receptive_language} />
      <CatSelect name="expressive_language" label="Expressive language" value={d.expressive_language} options={OPTIONS.expressive_language} />
      <CatSelect name="socialization" label="Socialization" value={d.socialization} options={OPTIONS.socialization} />
      <CatSelect name="physical_contact_needs" label="Physical contact needs" value={d.physical_contact_needs} options={OPTIONS.physical_contact_needs} />
      <CatSelect name="client_size" label="Client size (for age)" value={d.client_size} options={OPTIONS.client_size} />
      <CatSelect name="potty_training" label="Potty training" value={d.potty_training} options={OPTIONS.potty_training} />

      <div className="col-span-2 space-y-2">
        <Label>Languages at home</Label>
        <Input name="languages_at_home" defaultValue={d.languages_at_home ?? ''} placeholder="e.g. Spanish, Vietnamese" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Triggers</Label>
        <Textarea name="triggers" defaultValue={d.triggers ?? ''} rows={2} placeholder="What tends to set off behaviors" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Parent involvement / difficulty</Label>
        <Input name="parent_involvement" defaultValue={d.parent_involvement ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Strengths</Label>
        <Textarea name="strengths" defaultValue={d.strengths ?? ''} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Limitations</Label>
        <Textarea name="limitations" defaultValue={d.limitations ?? ''} rows={2} />
      </div>

      <div className="col-span-2 mt-1 pt-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consents &amp; Parent Training</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pt-1">
        <input
          type="checkbox"
          name="park_consent"
          defaultChecked={d.park_consent ?? false}
          className="size-4 rounded border-gray-300"
        />
        Park / outing consent on file
      </label>
      <div className="space-y-2">
        <Label>Parent training hours (target)</Label>
        <Input name="parent_training_hours" type="number" min={0} step={0.25} defaultValue={d.parent_training_hours ?? ''} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Survey</Label>
        <Textarea name="survey" defaultValue={d.survey ?? ''} rows={2} placeholder="Intake / satisfaction survey status or notes" />
      </div>
    </div>
  )
}
