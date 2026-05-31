'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSessionDate } from '@/app/actions/sessions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Mail, MapPin, Phone, User, Briefcase } from 'lucide-react'
import type { SessionOccurrence } from '@/lib/sessions/calendar'

type ParentSessionDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  occurrence: SessionOccurrence | null
  userId: string
  labels: {
    title: string
    therapistInfo: string
    sessionInfo: string
    name: string
    phone: string
    email: string
    city: string
    experience: string
    location: string
    time: string
    cancelSession: string
    cancelReason: string
    cancelReasonPlaceholder: string
    cancelSubmit: string
    cancelled: string
    back: string
    years: string
  }
}

export function ParentSessionDetailDialog({
  open,
  onOpenChange,
  occurrence,
  userId,
  labels,
}: ParentSessionDetailDialogProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!occurrence) return null

  const therapist = occurrence.session.therapist

  function handleCancel() {
    if (!reason.trim()) return
    startTransition(async () => {
      await cancelSessionDate(occurrence!.sessionId, occurrence!.date, reason, userId)
      onOpenChange(false)
      setShowCancelForm(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.therapistInfo}</DialogDescription>
        </DialogHeader>

        {occurrence.cancelled && (
          <Badge variant="secondary" className="w-fit">
            {labels.cancelled}
          </Badge>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.name}:</span>
              <span className="font-medium">{therapist?.profile?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.phone}:</span>
              <span className="font-medium">{therapist?.phone ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.email}:</span>
              <span className="font-medium">{therapist?.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.city}:</span>
              <span className="font-medium">{therapist?.city ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.experience}:</span>
              <span className="font-medium">
                {therapist?.years_of_experience ?? '—'} {labels.years}
              </span>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {labels.sessionInfo}
            </p>
            <p className="text-sm text-gray-600">
              {labels.time}: {occurrence.startTime.slice(0, 5)}–{occurrence.endTime.slice(0, 5)}
            </p>
            <p className="text-sm text-gray-600">
              {labels.location}: {occurrence.location}
            </p>
          </div>

          {!occurrence.cancelled && (
            <div className="border-t pt-4">
              {!showCancelForm ? (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCancelForm(true)}
                >
                  {labels.cancelSession}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">{labels.cancelReason}</Label>
                    <Textarea
                      id="cancel-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={labels.cancelReasonPlaceholder}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCancelForm(false)}
                    >
                      {labels.back ?? 'Back'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={isPending || !reason.trim()}
                      onClick={handleCancel}
                    >
                      {labels.cancelSubmit}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
