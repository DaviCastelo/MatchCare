'use client'

import { useState } from 'react'
import { SessionCalendar } from '@/components/sessions/session-calendar'
import { DaySessionsSheet } from '@/components/sessions/day-sessions-sheet'
import type { SessionOccurrence } from '@/lib/sessions/calendar'
import type { CalendarSession } from '@/lib/types/session'

type AdminGroupCalendarProps = {
  sessions: CalendarSession[]
  locale: string
  perspective: 'client' | 'therapist'
  labels: {
    previousMonth: string
    nextMonth: string
    daySheetTitle: string
    noSessionsOnDay: string
    cancelled: string
    client: string
    therapist: string
  }
}

export function AdminGroupCalendar({
  sessions,
  locale,
  perspective,
  labels,
}: AdminGroupCalendarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayOccurrences, setDayOccurrences] = useState<SessionOccurrence[]>([])

  function handleDayClick(date: Date, occurrences: SessionOccurrence[]) {
    setSelectedDate(date)
    setDayOccurrences(occurrences)
    setSheetOpen(true)
  }

  return (
    <>
      <SessionCalendar
        sessions={sessions}
        locale={locale}
        labels={{
          previousMonth: labels.previousMonth,
          nextMonth: labels.nextMonth,
        }}
        onDayClick={handleDayClick}
      />

      <DaySessionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        occurrences={dayOccurrences}
        locale={locale}
        role={perspective === 'client' ? 'parent' : 'therapist'}
        readOnly
        labels={{
          title: labels.daySheetTitle,
          noSessionsOnDay: labels.noSessionsOnDay,
          selectTime: '',
          cancelled: labels.cancelled,
          client: labels.client,
          therapist: labels.therapist,
        }}
        onSelectOccurrence={() => {}}
      />
    </>
  )
}
