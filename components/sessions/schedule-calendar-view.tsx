'use client'

import { useState } from 'react'
import { SessionCalendar } from '@/components/sessions/session-calendar'
import { DaySessionsSheet } from '@/components/sessions/day-sessions-sheet'
import { ParentSessionDetailDialog } from '@/components/sessions/parent-session-detail-dialog'
import { TherapistSessionDetailDialog } from '@/components/sessions/therapist-session-detail-dialog'
import type { SessionOccurrence } from '@/lib/sessions/calendar'
import type { CalendarSession } from '@/lib/types/session'

type ScheduleCalendarViewProps = {
  sessions: CalendarSession[]
  locale: string
  role: 'parent' | 'therapist'
  userId?: string
  labels: {
    previousMonth: string
    nextMonth: string
    daySheetTitle: string
    noSessionsOnDay: string
    selectTime: string
    cancelled: string
    client: string
    therapist: string
    detailTitle: string
    therapistInfo: string
    patientInfo: string
    sessionInfo: string
    name: string
    phone: string
    email: string
    city: string
    experience: string
    age: string
    parentPhone: string
    location: string
    time: string
    notes: string
    cancelSession: string
    cancelReason: string
    cancelReasonPlaceholder: string
    cancelSubmit: string
    years: string
    back: string
  }
}

export function ScheduleCalendarView({
  sessions,
  locale,
  role,
  userId,
  labels,
}: ScheduleCalendarViewProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayOccurrences, setDayOccurrences] = useState<SessionOccurrence[]>([])
  const [selectedOccurrence, setSelectedOccurrence] = useState<SessionOccurrence | null>(null)

  function handleDayClick(date: Date, occurrences: SessionOccurrence[]) {
    setSelectedDate(date)
    setDayOccurrences(occurrences)
    setSheetOpen(true)
  }

  function handleSelectOccurrence(occurrence: SessionOccurrence) {
    setSelectedOccurrence(occurrence)
    setSheetOpen(false)
    setDetailOpen(true)
  }

  return (
    <>
      <SessionCalendar
        sessions={sessions}
        locale={locale}
        labels={{ previousMonth: labels.previousMonth, nextMonth: labels.nextMonth }}
        onDayClick={handleDayClick}
      />

      <DaySessionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        occurrences={dayOccurrences}
        locale={locale}
        role={role}
        labels={{
          title: labels.daySheetTitle,
          noSessionsOnDay: labels.noSessionsOnDay,
          selectTime: labels.selectTime,
          cancelled: labels.cancelled,
          client: labels.client,
          therapist: labels.therapist,
        }}
        onSelectOccurrence={handleSelectOccurrence}
      />

      {role === 'parent' && userId && (
        <ParentSessionDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          occurrence={selectedOccurrence}
          userId={userId}
          labels={{
            title: labels.detailTitle,
            therapistInfo: labels.therapistInfo,
            sessionInfo: labels.sessionInfo,
            name: labels.name,
            phone: labels.phone,
            email: labels.email,
            city: labels.city,
            experience: labels.experience,
            location: labels.location,
            time: labels.time,
            cancelSession: labels.cancelSession,
            cancelReason: labels.cancelReason,
            cancelReasonPlaceholder: labels.cancelReasonPlaceholder,
            cancelSubmit: labels.cancelSubmit,
            cancelled: labels.cancelled,
            years: labels.years,
            back: labels.back,
          }}
        />
      )}

      {role === 'therapist' && (
        <TherapistSessionDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          occurrence={selectedOccurrence}
          labels={{
            title: labels.detailTitle,
            patientInfo: labels.patientInfo,
            sessionInfo: labels.sessionInfo,
            name: labels.name,
            age: labels.age,
            parentPhone: labels.parentPhone,
            city: labels.city,
            location: labels.location,
            time: labels.time,
            notes: labels.notes,
            cancelled: labels.cancelled,
            years: labels.years,
          }}
        />
      )}
    </>
  )
}
