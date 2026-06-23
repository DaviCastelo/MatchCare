'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  runMatch,
  getScheduleForTherapists,
  confirmMatch,
} from '@/app/actions/match'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertTriangle, CheckCircle, Plus, Users, X, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@/lib/types/client'
import type {
  MatchOutput,
  MatchResult,
  ScheduleResult,
  Slot,
  TherapistAssignment,
} from '@/lib/types/matching'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const THERAPIST_WEEKLY_TARGET = 15

// ── slot helpers ──
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const slotHours = (s: Slot) => (toMin(s.end_time) - toMin(s.start_time)) / 60
const slotKey = (s: Slot) => `${s.day_of_week}-${s.start_time}-${s.end_time}`
const overlaps = (a: Slot, b: Slot) =>
  a.day_of_week === b.day_of_week &&
  toMin(a.start_time) < toMin(b.end_time) &&
  toMin(a.end_time) > toMin(b.start_time)
const sortSlots = (slots: Slot[]) =>
  [...slots].sort((a, b) =>
    a.day_of_week - b.day_of_week || toMin(a.start_time) - toMin(b.start_time)
  )

export function MatchTool({ clients }: { clients: Client[]; locale: string }) {
  const t = useTranslations('match')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [matchOutput, setMatchOutput] = useState<MatchOutput | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [assignments, setAssignments] = useState<TherapistAssignment[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset(keepClient = false) {
    setMatchOutput(keepClient ? matchOutput : null)
    setSelectedIds([])
    setScheduleResult(null)
    setAssignments(null)
  }

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId)
    setMatchOutput(null)
    setSelectedIds([])
    setScheduleResult(null)
    setAssignments(null)

    startTransition(async () => {
      const output = await runMatch(clientId)
      setMatchOutput(output)
    })
  }

  function handleTherapistToggle(result: MatchResult) {
    setScheduleResult(null)
    setAssignments(null)
    const id = result.therapist.id
    const client = clients.find((c) => c.id === selectedClientId)
    const max = Math.min(3, Math.floor((client?.weekly_hours ?? 12) / 3))
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= max) return prev
      return [...prev, id]
    })
  }

  function handleGenerateSchedule() {
    if (selectedIds.length < 2) return

    startTransition(async () => {
      const result = await getScheduleForTherapists(selectedClientId, selectedIds)
      setScheduleResult(result)
      setAssignments(
        result.ok
          ? result.schedule.assignments.map((a) => ({ ...a, slots: [...a.slots] }))
          : null
      )
    })
  }

  // ── editing the proposed schedule ──
  function recompute(list: TherapistAssignment[]): TherapistAssignment[] {
    return list.map((a) => ({
      ...a,
      slots: sortSlots(a.slots),
      weeklyHours: a.slots.reduce((acc, s) => acc + slotHours(s), 0),
    }))
  }

  function addSlot(therapistId: string, slot: Slot) {
    setAssignments((prev) =>
      prev
        ? recompute(
            prev.map((a) =>
              a.therapist.id === therapistId ? { ...a, slots: [...a.slots, slot] } : a
            )
          )
        : prev
    )
  }

  function removeSlot(therapistId: string, key: string) {
    setAssignments((prev) =>
      prev
        ? recompute(
            prev.map((a) =>
              a.therapist.id === therapistId
                ? { ...a, slots: a.slots.filter((s) => slotKey(s) !== key) }
                : a
            )
          )
        : prev
    )
  }

  function handleConfirm() {
    if (!assignments || !canConfirm) return
    const payload: ScheduleResult = {
      ok: true,
      schedule: { assignments, totalWeeklyHours: total },
    }
    startTransition(async () => {
      try {
        await confirmMatch(selectedClientId, payload)
        toast.success(t('matchSuccess'))
        setSelectedClientId('')
        reset()
      } catch (e: unknown) {
        toast.error(
          e instanceof Error && e.message === 'CONFLICT' ? t('conflictError') : t('conflictError')
        )
      }
    })
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  // Max therapists this client's weekly load can support (each session >= 3h, each therapist >= 1 session)
  const maxTherapists = Math.min(3, Math.floor((selectedClient?.weekly_hours ?? 12) / 3))
  const hasGenderWarning = selectedIds.some((id) =>
    matchOutput?.eligible.find(
      (r) => r.therapist.id === id && r.flags.includes('GENDER_SENSITIVITY_WARNING')
    )
  )

  // all slots currently booked for the client (across all therapists) — for conflict checks
  const clientSlots = assignments?.flatMap((a) => a.slots) ?? []
  const total = assignments?.reduce((acc, a) => acc + a.weeklyHours, 0) ?? 0
  const canConfirm =
    !!assignments && assignments.length >= 2 && assignments.every((a) => a.slots.length > 0)

  // available overlapping windows for a therapist that aren't already scheduled
  function availableWindows(therapistId: string, scheduled: Slot[]): Slot[] {
    const all = matchOutput?.eligible.find((r) => r.therapist.id === therapistId)?.overlappingSlots ?? []
    const scheduledKeys = new Set(scheduled.map(slotKey))
    return sortSlots(all.filter((s) => !scheduledKeys.has(slotKey(s))))
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ─── Step 1: Select Client ─── */}
      <Card className="animate-in fade-in slide-in-from-bottom-3 duration-500">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
            {t('selectClientStep')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
            <Select
              value={selectedClientId || null}
              onValueChange={(v) => v && handleClientSelect(v)}
            >
              <SelectTrigger className="w-full sm:w-72 shrink-0">
                <SelectValue placeholder={t('selectClient')}>
                  {(value: string | null) => {
                    const c = clients.find((x) => x.id === value)
                    return c ? `${c.full_name} — Score ${c.behavior_score}` : t('selectClient')
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} — Score {c.behavior_score}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedClient && (
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Info label={t('infoCityLang')} value={`${selectedClient.city} · ${selectedClient.language}`} />
                <Info label={t('infoScore')} value={`${selectedClient.behavior_score}/9`} />
                <Info label={t('infoLocation')} value={selectedClient.preferred_session_location} />
                <Info label={t('infoWeekly')} value={`${selectedClient.weekly_hours}h`} />
              </div>
            )}

            {isPending && !matchOutput && (
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse self-center">{t('findingTherapists')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Step 2: Select 2–3 Therapists ─── */}
      <Card className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:80ms] fill-mode-both">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
              {t('eligibleTherapists')}
            </span>
            {matchOutput && matchOutput.eligible.length > 0 && (
              <span className="flex items-center gap-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {t('selectTherapistsHint')}
                <Badge
                  variant={selectedIds.length >= 2 ? 'default' : 'outline'}
                  className={selectedIds.length >= 2 ? 'bg-teal-600 text-white' : 'dark:border-gray-600 dark:text-gray-400'}
                >
                  {selectedIds.length}/2–{maxTherapists}
                </Badge>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!matchOutput && !isPending && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('selectClient')}</p>
          )}
          {matchOutput?.eligible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t('noEligible')}</p>
          )}

          {matchOutput && matchOutput.eligible.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchOutput.eligible.map((result) => {
                const isSelected = selectedIds.includes(result.therapist.id)
                const isDisabled = !isSelected && selectedIds.length >= maxTherapists
                const pct = Math.min(100, (result.currentWeeklyHours / THERAPIST_WEEKLY_TARGET) * 100)
                const hoursRemaining = Math.max(0, THERAPIST_WEEKLY_TARGET - result.currentWeeklyHours)

                return (
                  <button
                    key={result.therapist.id}
                    onClick={() => !isDisabled && handleTherapistToggle(result)}
                    disabled={isDisabled}
                    className={`text-left rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400'
                        : isDisabled
                        ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 bg-white dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-3.5 h-3.5 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                              <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <Avatar size="sm" className="size-7">
                          <AvatarImage src={result.therapist.profile?.avatar_url ?? undefined} alt={result.therapist.profile?.full_name ?? ''} />
                          <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-xs font-semibold">
                            {(result.therapist.profile?.full_name ?? result.therapist.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {result.therapist.profile?.full_name ?? result.therapist.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{result.score}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {result.therapist.city} · {result.therapist.language} · Score {result.therapist.professional_score}
                      {result.distanceMiles != null && ` · ${result.distanceMiles.toFixed(1)} mi`}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {result.currentWeeklyHours.toFixed(1)}/{THERAPIST_WEEKLY_TARGET}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {hoursRemaining > 0 ? t('hoursRemaining', { hours: hoursRemaining.toFixed(1) }) : t('hoursFull')}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {result.overlappingSlots.length} slot(s)
                      </span>
                    </div>

                    {result.flags.includes('GENDER_SENSITIVITY_WARNING') && (
                      <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        {t('genderNote')}
                      </div>
                    )}
                    {!result.therapist.sex && (
                      <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-gray-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        {t('sexNotSet')}
                      </div>
                    )}
                    {result.flags.includes('LONG_COMMUTE') && (
                      <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Long commute (&gt; 12 mi)
                      </div>
                    )}
                    {result.flags.includes('MISSING_LOCATION') && (
                      <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-gray-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        No ZIP on file — distance unknown
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedIds.length >= 2 && (
            <Button onClick={handleGenerateSchedule} disabled={isPending} className="bg-teal-600 hover:bg-teal-700 gap-2" size="sm">
              {t('generateSchedule')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 3: Proposed Weekly Schedule (editable) ─── */}
      <Card className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:160ms] fill-mode-both">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">3</span>
            {t('proposedSchedule')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scheduleResult && !isPending && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('selectTherapists')}</p>
          )}
          {selectedIds.length >= 2 && isPending && !scheduleResult && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{t('generatingSchedule')}</p>
          )}

          {hasGenderWarning && assignments && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                {t('genderWarning')}
              </AlertDescription>
            </Alert>
          )}

          {scheduleResult && !scheduleResult.ok && (
            <Alert variant="destructive">
              <AlertDescription>
                {t(`scheduleError_${scheduleResult.reason}` as 'scheduleError_insufficient_hours')}
              </AlertDescription>
            </Alert>
          )}

          {assignments && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => {
                  const windows = availableWindows(assignment.therapist.id, assignment.slots)
                  return (
                    <div
                      key={assignment.therapist.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {assignment.therapist.profile?.full_name ?? assignment.therapist.email}
                        </p>
                        <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                          {assignment.weeklyHours}h
                        </Badge>
                      </div>

                      {/* Scheduled sessions (removable) */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('scheduled')}</p>
                        {assignment.slots.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">—</p>
                        )}
                        {assignment.slots.map((slot) => (
                          <div
                            key={slotKey(slot)}
                            className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/25 rounded-lg px-2.5 py-1.5 border border-teal-100 dark:border-teal-800"
                          >
                            <Badge variant="outline" className="text-xs min-w-[38px] justify-center dark:border-gray-600 dark:text-gray-300">
                              {DAYS[slot.day_of_week]}
                            </Badge>
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {slot.start_time} – {slot.end_time}
                            </span>
                            <button
                              onClick={() => removeSlot(assignment.therapist.id, slotKey(slot))}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              aria-label={t('remove')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Other available windows (addable) */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('otherAvailable')}</p>
                        {windows.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('noOtherSlots')}</p>
                        )}
                        {windows.map((slot) => {
                          const conflict = clientSlots.some((cs) => overlaps(cs, slot))
                          return (
                            <button
                              key={slotKey(slot)}
                              onClick={() => !conflict && addSlot(assignment.therapist.id, slot)}
                              disabled={conflict}
                              title={conflict ? t('slotConflict') : t('addSlot')}
                              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-left transition-colors ${
                                conflict
                                  ? 'border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed'
                                  : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20'
                              }`}
                            >
                              <Badge variant="outline" className="text-xs min-w-[38px] justify-center dark:border-gray-600 dark:text-gray-300">
                                {DAYS[slot.day_of_week]}
                              </Badge>
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                                {slot.start_time} – {slot.end_time}
                              </span>
                              {!conflict && <Plus className="w-3.5 h-3.5 text-teal-500" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</span>
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{total}h / {t('week')}</span>
              </div>

              {!canConfirm && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{t('confirmHint')}</p>
              )}

              <Separator className="dark:border-gray-700" />
              <Button
                onClick={handleConfirm}
                disabled={isPending || !canConfirm}
                className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {t('confirmMatch')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
    </div>
  )
}
