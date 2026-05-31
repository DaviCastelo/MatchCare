'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  expandSessionOccurrences,
  groupOccurrencesByDate,
  type SessionOccurrence,
} from '@/lib/sessions/calendar'
import type { CalendarSession } from '@/lib/types/session'

const LOCALES = { 'pt-BR': ptBR, en: enUS, es } as const

type SessionCalendarProps = {
  sessions: CalendarSession[]
  locale: string
  labels: {
    previousMonth: string
    nextMonth: string
  }
  onDayClick: (date: Date, occurrences: SessionOccurrence[]) => void
}

export function SessionCalendar({
  sessions,
  locale,
  labels,
  onDayClick,
}: SessionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const dateLocale = LOCALES[locale as keyof typeof LOCALES] ?? enUS

  const occurrencesByDate = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const occurrences = expandSessionOccurrences(sessions, monthStart, monthEnd, {
      weeklyPatternOnly: true,
    })
    return groupOccurrencesByDate(occurrences)
  }, [sessions, currentMonth])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) =>
      format(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), 'EEE', {
        locale: dateLocale,
      })
    )
  }, [dateLocale])

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          aria-label={labels.previousMonth}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          aria-label={labels.nextMonth}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayOccurrences = occurrencesByDate.get(dateKey) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          const isToday = isSameDay(day, new Date())
          const activeCount = dayOccurrences.filter((o) => !o.cancelled).length

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!inMonth || dayOccurrences.length === 0}
              onClick={() => onDayClick(day, dayOccurrences)}
              className={cn(
                'min-h-[88px] border-b border-r border-gray-100 dark:border-gray-800 p-1.5 text-left transition-colors',
                !inMonth && 'bg-gray-50/50 dark:bg-gray-950/30 text-gray-300',
                inMonth && dayOccurrences.length > 0 && 'bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/20 cursor-pointer',
                inMonth && dayOccurrences.length === 0 && 'cursor-default',
                isToday && inMonth && 'ring-1 ring-inset ring-teal-400'
              )}
            >
              <span
                className={cn(
                  'inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1',
                  isToday && inMonth && 'bg-teal-600 text-white',
                  !(isToday && inMonth) && inMonth && 'text-gray-700 dark:text-gray-300'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {dayOccurrences.slice(0, 2).map((occ) => (
                  <div
                    key={`${occ.sessionId}-${occ.startTime}`}
                    className={cn(
                      'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                      occ.cancelled
                        ? 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
                    )}
                  >
                    {occ.startTime.slice(0, 5)}–{occ.endTime.slice(0, 5)}
                  </div>
                ))}
                {activeCount > 2 && (
                  <div className="text-[10px] text-gray-500 px-1">+{activeCount - 2}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
