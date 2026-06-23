'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { lookupZip } from '@/app/actions/locations'

type AddressFieldsProps = {
  states: string[]
  cities: string[]
  defaultStreet?: string | null
  defaultCity?: string | null
  defaultState?: string | null
  defaultZip?: string | null
  requireZip?: boolean
  includeSchoolZip?: boolean
  defaultSchoolZip?: string | null
}

/**
 * Street / ZIP / State / City address block used by the client & therapist forms.
 * - State is a dropdown (Select); City is a typeable dropdown (input + datalist).
 * - Typing a valid 5-digit ZIP auto-fills City and State from the zip_codes table.
 * All inputs carry `name` attributes so they submit with the surrounding <form>.
 */
export function AddressFields({
  states,
  cities,
  defaultStreet,
  defaultCity,
  defaultState,
  defaultZip,
  requireZip = false,
  includeSchoolZip = false,
  defaultSchoolZip,
}: AddressFieldsProps) {
  const [zip, setZip] = useState(defaultZip ?? '')
  const [city, setCity] = useState(defaultCity ?? '')
  const [stateVal, setStateVal] = useState(defaultState || 'CA')
  const [isLooking, startLookup] = useTransition()

  // Keep the current value selectable even if it isn't in the seeded list yet.
  const stateOptions = Array.from(new Set([stateVal, ...states].filter(Boolean)))

  function onZipChange(value: string) {
    const v = value.replace(/\D/g, '').slice(0, 5)
    setZip(v)
    if (v.length === 5) {
      startLookup(async () => {
        const hit = await lookupZip(v)
        if (hit?.city) setCity(hit.city)
        if (hit?.state) setStateVal(hit.state)
      })
    }
  }

  return (
    <>
      <div className="col-span-2 space-y-2">
        <Label>Street Address</Label>
        <Input name="street_address" defaultValue={defaultStreet ?? ''} placeholder="123 Main St" />
      </div>

      <div className="space-y-2">
        <Label>ZIP {isLooking && <span className="text-xs text-gray-400">…</span>}</Label>
        <Input
          name="zip_code"
          value={zip}
          onChange={(e) => onZipChange(e.target.value)}
          required={requireZip}
          placeholder="95112"
          inputMode="numeric"
          pattern="\d{5}"
          title="5-digit ZIP — fills City and State automatically"
        />
      </div>

      <div className="space-y-2">
        <Label>State</Label>
        <Select name="state" value={stateVal} onValueChange={(v) => setStateVal(v ?? '')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {stateOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 space-y-2">
        <Label>City</Label>
        <Input
          name="city"
          list="address-city-options"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Start typing or pick from the list…"
          autoComplete="off"
          required
        />
        <datalist id="address-city-options">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {includeSchoolZip && (
        <div className="col-span-2 space-y-2">
          <Label>
            School ZIP <span className="text-xs text-gray-400">(if session location is School)</span>
          </Label>
          <Input
            name="school_zip_code"
            defaultValue={defaultSchoolZip ?? ''}
            placeholder="95112"
            inputMode="numeric"
            pattern="\d{5}"
            title="5-digit ZIP"
          />
        </div>
      )}
    </>
  )
}
