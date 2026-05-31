'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, User, Calendar, FileText } from 'lucide-react'
import type { SessionOccurrence } from '@/lib/sessions/calendar'

type TherapistSessionDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  occurrence: SessionOccurrence | null
  labels: {
    title: string
    patientInfo: string
    sessionInfo: string
    name: string
    age: string
    parentPhone: string
    city: string
    location: string
    time: string
    notes: string
    cancelled: string
    years: string
  }
}

export function TherapistSessionDetailDialog({
  open,
  onOpenChange,
  occurrence,
  labels,
}: TherapistSessionDetailDialogProps) {
  if (!occurrence) return null

  const client = occurrence.session.client

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.patientInfo}</DialogDescription>
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
              <span className="font-medium">{client?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.age}:</span>
              <span className="font-medium">
                {client?.age ?? '—'} {labels.years}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.parentPhone}:</span>
              <span className="font-medium">{client?.parent_phone ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="text-gray-500">{labels.city}:</span>
              <span className="font-medium">{client?.city ?? '—'}</span>
            </div>
            {client?.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-teal-600 mt-0.5" />
                <div>
                  <span className="text-gray-500">{labels.notes}:</span>
                  <p className="font-medium mt-0.5">{client.notes}</p>
                </div>
              </div>
            )}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
