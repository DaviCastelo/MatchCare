'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { upsertTherapistAvailability } from '@/app/actions/therapists'
import { upsertClientAvailability } from '@/app/actions/clients'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Slot = { day_of_week: number; start_time: string; end_time: string }

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
// Display order: Mon → Sun (Brazilian-friendly)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAYS = [1, 2, 3, 4, 5]

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
  const tc = useTranslations('common')
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [isPending, startTransition] = useTransition()

  // quick-add state
  const [selectedDays, setSelectedDays] = useState<number[]>([...WEEKDAYS])
  const [qStart, setQStart] = useState('08:00')
  const [qEnd, setQEnd] = useState('17:00')

  const dayLabel = (v: number) => tc(DAY_KEYS[v])
  const dayShort = (v: number) => dayLabel(v).slice(0, 3)

  function toggleDay(d: number) {
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function addSelected() {
    if (selectedDays.length === 0) return
    if (qStart >= qEnd) {
      toast.error(t('invalidRange'))
      return
    }
    setSlots((prev) => {
      const next = [...prev]
      for (const d of [...selectedDays].sort((a, b) => a - b)) {
        const dup = next.some(
          (s) => s.day_of_week === d && s.start_time === qStart && s.end_time === qEnd
        )
        if (!dup) next.push({ day_of_week: d, start_time: qStart, end_time: qEnd })
      }
      return next.sort(
        (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      )
    })
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index))
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    setSlots(slots.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function save() {
    startTransition(async () => {
      try {
        if (entityType === 'therapist') {
          await upsertTherapistAvailability(entityId, slots)
        } else {
          await upsertClientAvailability(entityId, slots)
        }
        toast.success(t('availabilitySaved'))
      } catch {
        toast.error(t('availabilityError'))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('availability')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Quick add: pick days + one time range ── */}
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('addMultiple')}
          </Label>

          {/* Day toggles */}
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((d) => {
              const on = selectedDays.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    on
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-teal-400'
                  )}
                >
                  {dayShort(d)}
                </button>
              )
            })}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={() => setSelectedDays([...WEEKDAYS])} className="text-teal-600 dark:text-teal-400 hover:underline">
              {t('weekdays')}
            </button>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <button type="button" onClick={() => setSelectedDays([...DAY_ORDER])} className="text-teal-600 dark:text-teal-400 hover:underline">
              {t('everyDay')}
            </button>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <button type="button" onClick={() => setSelectedDays([])} className="text-gray-500 hover:underline">
              {t('clearDays')}
            </button>
          </div>

          {/* Time range + add */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('from')}</Label>
              <Input type="time" value={qStart} onChange={(e) => setQStart(e.target.value)} className="w-32" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('to')}</Label>
              <Input type="time" value={qEnd} onChange={(e) => setQEnd(e.target.value)} className="w-32" />
            </div>
            <Button
              type="button"
              onClick={addSelected}
              disabled={selectedDays.length === 0}
              size="sm"
              className="gap-1 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-3 h-3" />
              {t('add')}{selectedDays.length > 0 ? ` (${selectedDays.length})` : ''}
            </Button>
          </div>
        </div>

        {/* ── Existing slots (fine-tune individually) ── */}
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noSlots')}</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(slot.day_of_week)}
                  onValueChange={(v) => updateSlot(index, 'day_of_week', Number(v))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_ORDER.map((d) => (
                      <SelectItem key={d} value={String(d)}>{dayLabel(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                  className="w-32"
                />
                <span className="text-muted-foreground text-sm">{t('to')}</span>
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
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={save}
          disabled={isPending}
          className="bg-teal-600 hover:bg-teal-700"
          size="sm"
        >
          {isPending ? t('saving') : t('saveChanges')}
        </Button>
      </CardContent>
    </Card>
  )
}
