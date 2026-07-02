import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ONBOARDING_STAGES } from '@/lib/admin/onboarding'

export type OnboardingDefaults = {
  onboarding_stage?: string | null
  referral_date?: string | null
  intake_date?: string | null
  assessment_date?: string | null
  projected_start_date?: string | null
  actual_start_date?: string | null
  onboarding_owner?: string | null
  onboarding_notes?: string | null
}

/**
 * Intake-pipeline inputs for the client forms. All inputs carry `name`
 * attributes and submit with the surrounding <form>; parse with
 * parseOnboardingFields(). Server component — Select is uncontrolled.
 */
export function OnboardingFields({ defaults = {} }: { defaults?: OnboardingDefaults }) {
  const d = defaults
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-2">
        <Label>Pipeline stage</Label>
        <Select name="onboarding_stage" defaultValue={d.onboarding_stage || 'none'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not in pipeline</SelectItem>
            {ONBOARDING_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Referral date</Label>
        <Input name="referral_date" type="date" defaultValue={d.referral_date ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Intake date</Label>
        <Input name="intake_date" type="date" defaultValue={d.intake_date ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Assessment date</Label>
        <Input name="assessment_date" type="date" defaultValue={d.assessment_date ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Projected start</Label>
        <Input name="projected_start_date" type="date" defaultValue={d.projected_start_date ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Actual start</Label>
        <Input name="actual_start_date" type="date" defaultValue={d.actual_start_date ?? ''} />
      </div>
      <div className="space-y-2">
        <Label>Onboarding owner</Label>
        <Input name="onboarding_owner" defaultValue={d.onboarding_owner ?? ''} placeholder="Who's driving intake" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Onboarding notes</Label>
        <Textarea name="onboarding_notes" defaultValue={d.onboarding_notes ?? ''} rows={2} />
      </div>
    </div>
  )
}
