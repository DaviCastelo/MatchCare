'use client'

import { format, parseISO } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SessionOccurrence } from '@/lib/sessions/calendar'

const LOCALES = { 'pt-BR': ptBR, en: enUS, es } as const

type DaySessionsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  occurrences: SessionOccurrence[]
  locale: string
  role: 'parent' | 'therapist'
  labels: {
    title: string
    noSessionsOnDay: string
    selectTime: string
    cancelled: string
    client: string
    therapist: string
  }
  onSelectOccurrence: (occurrence: SessionOccurrence) => void
  readOnly?: boolean
}

export function DaySessionsSheet({
  open,
  onOpenChange,
  date,
  occurrences,
  locale,
  role,
  labels,
  onSelectOccurrence,
  readOnly = false,
}: DaySessionsSheetProps) {
  const dateLocale = LOCALES[locale as keyof typeof LOCALES] ?? enUS

  const formattedDate = date
    ? format(date, "EEEE, d 'de' MMMM", { locale: dateLocale })
    : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{formattedDate}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {occurrences.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{labels.noSessionsOnDay}</p>
          ) : (
            occurrences.map((occ) => {
              const linkedName =
                role === 'parent'
                  ? occ.session.therapist?.profile?.full_name ?? '—'
                  : occ.session.client?.full_name ?? '—'

              const content = (
                <>
                  <div className="flex flex-col min-w-[72px]">
                    <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {occ.startTime.slice(0, 5)}–{occ.endTime.slice(0, 5)}
                    </span>
                    <span className="text-xs text-gray-500">{occ.location}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {role === 'parent' ? labels.therapist : labels.client}: {linkedName}
                    </p>
                    {occ.cancelled && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {labels.cancelled}
                      </Badge>
                    )}
                  </div>
                </>
              )

              if (readOnly) {
                return (
                  <div
                    key={`${occ.sessionId}-${occ.startTime}`}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border',
                      occ.cancelled
                        ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-800'
                    )}
                  >
                    {content}
                  </div>
                )
              }

              return (
                <button
                  key={`${occ.sessionId}-${occ.startTime}`}
                  type="button"
                  onClick={() => onSelectOccurrence(occ)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                    occ.cancelled
                      ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50 dark:border-gray-800 dark:hover:bg-teal-950/20'
                  )}
                >
                  {content}
                </button>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { parseISO }
