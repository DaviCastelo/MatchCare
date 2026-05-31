'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSession, updateSession } from '@/app/actions/sessions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AdminSessionRow, SessionInsert } from '@/lib/types/session'

type FormOption = { id: string; name: string; city: string }

type AdminSessionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: AdminSessionRow | null
  clients: FormOption[]
  therapists: FormOption[]
  labels: {
    createTitle: string
    editTitle: string
    client: string
    therapist: string
    day: string
    startTime: string
    endTime: string
    location: string
    status: string
    recurrenceStart: string
    recurrenceEnd: string
    save: string
    cancel: string
    clinic: string
    school: string
    home: string
    active: string
    cancelled: string
    rescheduled: string
  days: string[]
  validation: Record<string, string>
}
}

const EMPTY_FORM: SessionInsert = {
  client_id: '',
  therapist_id: '',
  location: 'Clinic',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '13:00',
  status: 'active',
  recurrence_start: new Date().toISOString().slice(0, 10),
  recurrence_end: null,
}

export function AdminSessionFormDialog({
  open,
  onOpenChange,
  session,
  clients,
  therapists,
  labels,
}: AdminSessionFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SessionInsert>(EMPTY_FORM)

  const isEdit = !!session

  useEffect(() => {
    if (!open) return
    if (session) {
      setForm({
        client_id: session.client_id,
        therapist_id: session.therapist_id,
        location: session.location,
        day_of_week: session.day_of_week,
        start_time: session.start_time.slice(0, 5),
        end_time: session.end_time.slice(0, 5),
        status: session.status,
        recurrence_start: session.recurrence_start,
        recurrence_end: session.recurrence_end,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [open, session])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  function resolveError(message: string) {
    if (message.startsWith('validation.')) {
      const key = message.replace('validation.', '')
      return labels.validation[key] ?? message
    }
    return message
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const payload = {
        ...form,
        start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
        end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
      }

      const result = isEdit
        ? await updateSession(session!.id, payload)
        : await createSession(payload)

      if (!result.ok) {
        setError(resolveError(result.error))
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? labels.editTitle : labels.createTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? labels.editTitle : labels.createTitle}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>{labels.client}</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm((f) => ({ ...f, client_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={labels.client} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{labels.therapist}</Label>
              <Select
                value={form.therapist_id}
                onValueChange={(v) => setForm((f) => ({ ...f, therapist_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={labels.therapist} />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{labels.day}</Label>
              <Select
                value={String(form.day_of_week)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, day_of_week: Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labels.days.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{labels.location}</Label>
              <Select
                value={form.location}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    location: (v ?? 'Clinic') as SessionInsert['location'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinic">{labels.clinic}</SelectItem>
                  <SelectItem value="School">{labels.school}</SelectItem>
                  <SelectItem value="Home">{labels.home}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{labels.startTime}</Label>
              <Input
                type="time"
                value={form.start_time.slice(0, 5)}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.endTime}</Label>
              <Input
                type="time"
                value={form.end_time.slice(0, 5)}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.recurrenceStart}</Label>
              <Input
                type="date"
                value={form.recurrence_start}
                onChange={(e) => setForm((f) => ({ ...f, recurrence_start: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.recurrenceEnd}</Label>
              <Input
                type="date"
                value={form.recurrence_end ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recurrence_end: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{labels.status}</Label>
              <Select
                value={form.status ?? 'active'}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: (v ?? 'active') as SessionInsert['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{labels.active}</SelectItem>
                  <SelectItem value="cancelled">{labels.cancelled}</SelectItem>
                  <SelectItem value="rescheduled">{labels.rescheduled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {labels.cancel}
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={isPending}>
              {labels.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
