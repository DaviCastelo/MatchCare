'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSession } from '@/app/actions/sessions'
import { AdminSessionFormDialog } from '@/components/sessions/admin-session-form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminGroupCalendar } from '@/components/sessions/admin-group-calendar'
import type { AdminSessionFilters, AdminSessionRow, CalendarSession } from '@/lib/types/session'

type FormOption = { id: string; name: string; city: string }

type AdminTableLabels = {
  searchPlaceholder: string
  client: string
  therapist: string
  day: string
  time: string
  location: string
  status: string
  active: string
  cancelled: string
  rescheduled: string
  noSessions: string
  newSession: string
  createTitle: string
  editTitle: string
  startTime: string
  endTime: string
  recurrenceStart: string
  recurrenceEnd: string
  save: string
  cancel: string
  delete: string
  clinic: string
  school: string
  home: string
  all: string
  actions: string
  city: string
  confirmDelete: string
  confirmDeleteDesc: string
  days: string[]
  validation: Record<string, string>
  sessionsCount: string
  sessionsColumn: string
  linkedTherapists: string
  linkedClients: string
  expandSessions: string
  collapseSessions: string
  showCalendar: string
  hideCalendar: string
  previousMonth: string
  nextMonth: string
  daySheetTitle: string
  noSessionsOnDay: string
}

type AdminSessionsTableProps = {
  sessions: AdminSessionRow[]
  clients: FormOption[]
  therapists: FormOption[]
  perspective: 'client' | 'therapist'
  locale: string
  labels: AdminTableLabels
}

type GroupedEntity = {
  id: string
  name: string
  city: string
  sessions: AdminSessionRow[]
  linkedNames: string[]
}

function formatSessionsCount(template: string, count: number) {
  return template.replace('{count}', String(count))
}

export function AdminSessionsTable({
  sessions,
  clients,
  therapists,
  perspective,
  locale,
  labels,
}: AdminSessionsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<AdminSessionRow | null>(null)
  const [deletingSession, setDeletingSession] = useState<AdminSessionRow | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [calendarIds, setCalendarIds] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<AdminSessionFilters>({
    search: '',
    status: undefined,
    location: undefined,
    day_of_week: undefined,
    city: '',
  })

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (filters.status && session.status !== filters.status) return false
      if (filters.location && session.location !== filters.location) return false
      if (filters.day_of_week !== undefined && session.day_of_week !== filters.day_of_week)
        return false

      if (filters.city) {
        const city =
          perspective === 'client' ? session.client?.city : session.therapist?.city
        if (!city?.toLowerCase().includes(filters.city.toLowerCase())) return false
      }

      if (filters.search) {
        const q = filters.search.toLowerCase()
        const primary =
          perspective === 'client'
            ? session.client?.full_name?.toLowerCase() ?? ''
            : session.therapist?.profile?.full_name?.toLowerCase() ?? ''
        const secondary =
          perspective === 'client'
            ? session.therapist?.profile?.full_name?.toLowerCase() ?? ''
            : session.client?.full_name?.toLowerCase() ?? ''
        if (!primary.includes(q) && !secondary.includes(q)) return false
      }

      return true
    })
  }, [sessions, filters, perspective])

  const grouped = useMemo(() => {
    const map = new Map<string, AdminSessionRow[]>()

    for (const session of filtered) {
      const key = perspective === 'client' ? session.client_id : session.therapist_id
      const list = map.get(key) ?? []
      list.push(session)
      map.set(key, list)
    }

    const groups: GroupedEntity[] = []

    for (const [id, entitySessions] of map) {
      const sorted = [...entitySessions].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
        return a.start_time.localeCompare(b.start_time)
      })

      const linked = [
        ...new Set(
          sorted.map((s) =>
            perspective === 'client'
              ? s.therapist?.profile?.full_name ?? '—'
              : s.client?.full_name ?? '—'
          )
        ),
      ]

      groups.push({
        id,
        name:
          perspective === 'client'
            ? sorted[0].client?.full_name ?? '—'
            : sorted[0].therapist?.profile?.full_name ?? '—',
        city:
          perspective === 'client'
            ? sorted[0].client?.city ?? '—'
            : sorted[0].therapist?.city ?? '—',
        sessions: sorted,
        linkedNames: linked,
      })
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered, perspective])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setCalendarIds((cal) => {
          const calNext = new Set(cal)
          calNext.delete(id)
          return calNext
        })
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleCalendar(id: string) {
    setCalendarIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDelete() {
    if (!deletingSession) return
    startTransition(async () => {
      await deleteSession(deletingSession.id)
      setDeleteOpen(false)
      setDeletingSession(null)
      router.refresh()
    })
  }

  const days = labels.days
  const linkedColumnLabel =
    perspective === 'client' ? labels.linkedTherapists : labels.linkedClients

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={labels.searchPlaceholder}
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              status: v === 'all' ? undefined : (v as AdminSessionFilters['status']),
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={labels.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all}</SelectItem>
            <SelectItem value="active">{labels.active}</SelectItem>
            <SelectItem value="cancelled">{labels.cancelled}</SelectItem>
            <SelectItem value="rescheduled">{labels.rescheduled}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.location ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              location: v === 'all' ? undefined : (v as AdminSessionFilters['location']),
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={labels.location} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all}</SelectItem>
            <SelectItem value="Clinic">{labels.clinic}</SelectItem>
            <SelectItem value="School">{labels.school}</SelectItem>
            <SelectItem value="Home">{labels.home}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.day_of_week !== undefined ? String(filters.day_of_week) : 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              day_of_week: v === 'all' ? undefined : Number(v),
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={labels.day} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all}</SelectItem>
            {days.map((day, i) => (
              <SelectItem key={day} value={String(i)}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={labels.city}
          className="w-[140px]"
          value={filters.city ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
        />
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => {
            setEditingSession(null)
            setFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4" />
          {labels.newSession}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>
                {perspective === 'client' ? labels.client : labels.therapist}
              </TableHead>
              <TableHead>{labels.city}</TableHead>
              <TableHead>{linkedColumnLabel}</TableHead>
              <TableHead>{labels.sessionsColumn}</TableHead>
              <TableHead className="text-right">{labels.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {labels.noSessions}
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((group) => {
                const isExpanded = expandedIds.has(group.id)
                const isCalendarOpen = calendarIds.has(group.id)
                const activeCount = group.sessions.filter((s) => s.status === 'active').length
                const calendarSessions = group.sessions.filter(
                  (s) => s.status !== 'cancelled'
                ) as CalendarSession[]

                return (
                  <Fragment key={group.id}>
                    <TableRow className="bg-white dark:bg-gray-900">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleExpanded(group.id)}
                          aria-label={isExpanded ? labels.collapseSessions : labels.expandSessions}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-gray-500">{group.city}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {group.linkedNames.join(', ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {formatSessionsCount(labels.sessionsCount, group.sessions.length)}
                          {activeCount < group.sessions.length && (
                            <span className="ml-1 text-gray-500">
                              ({activeCount} {labels.active.toLowerCase()})
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-teal-700"
                          onClick={() => toggleExpanded(group.id)}
                        >
                          {isExpanded ? labels.collapseSessions : labels.expandSessions}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-gray-50/80 dark:bg-gray-950/50 hover:bg-gray-50/80">
                        <TableCell colSpan={6} className="p-0">
                          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 space-y-4">
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50"
                                onClick={() => toggleCalendar(group.id)}
                              >
                                <CalendarDays className="w-4 h-4" />
                                {isCalendarOpen ? labels.hideCalendar : labels.showCalendar}
                              </Button>
                            </div>

                            {isCalendarOpen && (
                              <AdminGroupCalendar
                                sessions={calendarSessions}
                                locale={locale}
                                perspective={perspective}
                                labels={{
                                  previousMonth: labels.previousMonth,
                                  nextMonth: labels.nextMonth,
                                  daySheetTitle: labels.daySheetTitle,
                                  noSessionsOnDay: labels.noSessionsOnDay,
                                  cancelled: labels.cancelled,
                                  client: labels.client,
                                  therapist: labels.therapist,
                                }}
                              />
                            )}

                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>
                                    {perspective === 'client'
                                      ? labels.therapist
                                      : labels.client}
                                  </TableHead>
                                  <TableHead>{labels.day}</TableHead>
                                  <TableHead>{labels.time}</TableHead>
                                  <TableHead>{labels.location}</TableHead>
                                  <TableHead>{labels.status}</TableHead>
                                  <TableHead className="text-right">{labels.actions}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.sessions.map((session) => (
                                  <TableRow key={session.id}>
                                    <TableCell>
                                      {perspective === 'client'
                                        ? session.therapist?.profile?.full_name
                                        : session.client?.full_name}
                                    </TableCell>
                                    <TableCell>{days[session.day_of_week]}</TableCell>
                                    <TableCell>
                                      {session.start_time.slice(0, 5)}–
                                      {session.end_time.slice(0, 5)}
                                    </TableCell>
                                    <TableCell>{session.location}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          session.status === 'active' &&
                                            'bg-green-100 text-green-700',
                                          session.status === 'cancelled' &&
                                            'bg-red-100 text-red-700',
                                          session.status === 'rescheduled' &&
                                            'bg-amber-100 text-amber-700'
                                        )}
                                      >
                                        {session.status === 'active'
                                          ? labels.active
                                          : session.status === 'cancelled'
                                          ? labels.cancelled
                                          : labels.rescheduled}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => {
                                            setEditingSession(session)
                                            setFormOpen(true)
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="text-red-600"
                                          onClick={() => {
                                            setDeletingSession(session)
                                            setDeleteOpen(true)
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AdminSessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editingSession}
        clients={clients}
        therapists={therapists}
        labels={{
          createTitle: labels.createTitle,
          editTitle: labels.editTitle,
          client: labels.client,
          therapist: labels.therapist,
          day: labels.day,
          startTime: labels.startTime,
          endTime: labels.endTime,
          location: labels.location,
          status: labels.status,
          recurrenceStart: labels.recurrenceStart,
          recurrenceEnd: labels.recurrenceEnd,
          save: labels.save,
          cancel: labels.cancel,
          clinic: labels.clinic,
          school: labels.school,
          home: labels.home,
          active: labels.active,
          cancelled: labels.cancelled,
          rescheduled: labels.rescheduled,
          days,
          validation: labels.validation,
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.confirmDelete}</DialogTitle>
            <DialogDescription>{labels.confirmDeleteDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              {labels.cancel}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isPending}
              onClick={handleDelete}
            >
              {labels.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
