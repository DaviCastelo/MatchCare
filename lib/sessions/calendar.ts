import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import type { SessionException } from '@/lib/types/session'
import type { CalendarSession } from '@/lib/types/session'

export type SessionOccurrence = {
  sessionId: string
  date: string
  startTime: string
  endTime: string
  location: 'Clinic' | 'School' | 'Home'
  status: 'active' | 'cancelled' | 'rescheduled'
  cancelled: boolean
  session: CalendarSession
}

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isDateInRecurrence(date: Date, session: CalendarSession): boolean {
  const current = startOfDay(date)

  if (session.recurrence_end) {
    const end = startOfDay(parseLocalDate(session.recurrence_end))
    if (isAfter(current, end)) return false
  }

  if (session.recurrence_start) {
    const start = startOfDay(parseLocalDate(session.recurrence_start))
    if (isBefore(current, start)) return false
  }

  return true
}

function isCancelledOnDate(
  sessionId: string,
  dateKey: string,
  exceptions: SessionException[]
): boolean {
  return exceptions.some(
    (ex) =>
      ex.session_id === sessionId &&
      ex.exception_date === dateKey &&
      ex.type === 'cancellation'
  )
}

export function expandSessionOccurrences(
  sessions: CalendarSession[],
  monthStart: Date,
  monthEnd: Date,
  options?: { weeklyPatternOnly?: boolean }
): SessionOccurrence[] {
  const occurrences: SessionOccurrence[] = []
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const weeklyPatternOnly = options?.weeklyPatternOnly ?? false

  for (const session of sessions) {
    if (session.status === 'cancelled') continue

    const exceptions = session.exceptions ?? []

    for (const day of days) {
      if (day.getDay() !== session.day_of_week) continue

      if (!weeklyPatternOnly && !isDateInRecurrence(day, session)) continue

      if (weeklyPatternOnly && session.recurrence_end) {
        const end = startOfDay(parseLocalDate(session.recurrence_end))
        if (isAfter(startOfDay(day), end)) continue
      }

      const dateKey = toDateKey(day)
      const cancelled = isCancelledOnDate(session.id, dateKey, exceptions)

      occurrences.push({
        sessionId: session.id,
        date: dateKey,
        startTime: session.start_time,
        endTime: session.end_time,
        location: session.location,
        status: session.status,
        cancelled,
        session,
      })
    }
  }

  return occurrences.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return a.startTime.localeCompare(b.startTime)
  })
}

export function groupOccurrencesByDate(
  occurrences: SessionOccurrence[]
): Map<string, SessionOccurrence[]> {
  const map = new Map<string, SessionOccurrence[]>()

  for (const occ of occurrences) {
    const list = map.get(occ.date) ?? []
    list.push(occ)
    map.set(occ.date, list)
  }

  return map
}

export function getMonthRange(referenceDate: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(referenceDate),
    end: endOfMonth(referenceDate),
  }
}

export function getOccurrencesForDate(
  occurrences: SessionOccurrence[],
  date: Date
): SessionOccurrence[] {
  const key = toDateKey(date)
  return occurrences.filter((o) => o.date === key)
}

export function hasOccurrencesOnDate(
  occurrences: SessionOccurrence[],
  date: Date
): boolean {
  return getOccurrencesForDate(occurrences, date).length > 0
}

export { toDateKey, isSameDay, addDays, format, startOfMonth, endOfMonth }
