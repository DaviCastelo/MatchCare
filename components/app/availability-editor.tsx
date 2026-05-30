'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { upsertTherapistAvailability } from '@/app/actions/therapists'
import { upsertClientAvailability } from '@/app/actions/clients'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Slot = { day_of_week: number; start_time: string; end_time: string }

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function AvailabilityEditor({
  entityId,
  entityType,
  initialSlots,
}: {
  entityId: string
  entityType: 'therapist' | 'client'
  initialSlots: Slot[]
}) {
  const t = useTranslations('profile')
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [isPending, startTransition] = useTransition()

  function addSlot() {
    setSlots([...slots, { day_of_week: 1, start_time: '09:00', end_time: '13:00' }])
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index))
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    setSlots(slots.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function save() {
    startTransition(async () => {
      try {
        if (entityType === 'therapist') {
          await upsertTherapistAvailability(entityId, slots)
        } else {
          await upsertClientAvailability(entityId, slots)
        }
        toast.success('Availability saved!')
      } catch {
        toast.error('Failed to save availability')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('availability')}</CardTitle>
        <Button onClick={addSlot} size="sm" variant="outline" className="gap-1">
          <Plus className="w-3 h-3" />{t('addSlot')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No time slots yet. Add one above.</p>
        )}
        {slots.map((slot, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={String(slot.day_of_week)}
              onValueChange={(v) => updateSlot(index, 'day_of_week', Number(v))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={slot.start_time}
              onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
              className="w-32"
            />
            <span className="text-gray-400 text-sm">to</span>
            <Input
              type="time"
              value={slot.end_time}
              onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
              className="w-32"
            />
            <Button
              onClick={() => removeSlot(index)}
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {slots.length > 0 && (
          <Button
            onClick={save}
            disabled={isPending}
            className="bg-teal-600 hover:bg-teal-700 mt-2"
            size="sm"
          >
            {isPending ? 'Saving...' : t('saveChanges')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
