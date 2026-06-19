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
import { AlertTriangle, CheckCircle, ChevronDown, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@/lib/types/client'
import type { MatchOutput, MatchResult, ScheduleResult } from '@/lib/types/matching'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MatchTool({ clients }: { clients: Client[]; locale: string }) {
  const t = useTranslations('match')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [matchOutput, setMatchOutput] = useState<MatchOutput | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId)
    setMatchOutput(null)
    setSelectedIds([])
    setScheduleResult(null)
    setOpen(false)

    startTransition(async () => {
      const output = await runMatch(clientId)
      setMatchOutput(output)
    })
  }

  function handleTherapistToggle(result: MatchResult) {
    setScheduleResult(null)
    const id = result.therapist.id
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  function handleGenerateSchedule() {
    if (selectedIds.length < 2) return

    startTransition(async () => {
      const result = await getScheduleForTherapists(selectedClientId, selectedIds)
      setScheduleResult(result)
    })
  }

  function handleConfirm() {
    if (!scheduleResult?.ok) return

    startTransition(async () => {
      try {
        await confirmMatch(selectedClientId, scheduleResult)
        toast.success(t('matchSuccess'))
        setMatchOutput(null)
        setSelectedIds([])
        setScheduleResult(null)
        setSelectedClientId('')
      } catch (e: unknown) {
        toast.error(
          e instanceof Error && e.message === 'CONFLICT'
            ? t('conflictError')
            : t('conflictError')
        )
      }
    })
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const hasGenderWarning = selectedIds.some((id) =>
    matchOutput?.eligible.find(
      (r) => r.therapist.id === id && r.flags.includes('GENDER_SENSITIVITY_WARNING')
    )
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* ─── Step 1: Select Client ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <span className={selectedClient ? '' : 'text-gray-400 dark:text-gray-500'}>
                {selectedClient
                  ? `${selectedClient.full_name} — Score ${selectedClient.behavior_score}`
                  : t('selectClient')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {open && (
              <div className="absolute z-50 w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleClientSelect(c.id)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                  >
                    {c.full_name} — Score {c.behavior_score}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 space-y-1 text-sm border border-gray-100 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100">{selectedClient.full_name}</p>
              <p className="text-gray-500 dark:text-gray-400">{selectedClient.city} · {selectedClient.language}</p>
              <p className="text-gray-500 dark:text-gray-400">Behavior Score: {selectedClient.behavior_score}/9</p>
              <p className="text-gray-500 dark:text-gray-400">Location: {selectedClient.preferred_session_location}</p>
            </div>
          )}

          {isPending && !matchOutput && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Finding therapists...</p>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 2: Select 2–3 Therapists ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
            {t('eligibleTherapists')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!matchOutput && !isPending && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('selectClient')}</p>
          )}

          {matchOutput?.eligible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t('noEligible')}</p>
          )}

          {matchOutput && matchOutput.eligible.length > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {t('selectTherapistsHint')}
              </span>
              <Badge
                variant={selectedIds.length >= 2 ? 'default' : 'outline'}
                className={selectedIds.length >= 2
                  ? 'bg-teal-600 text-white text-xs'
                  : 'text-xs dark:border-gray-600 dark:text-gray-400'}
              >
                {selectedIds.length}/2–3
              </Badge>
            </div>
          )}

          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {matchOutput?.eligible.map((result) => {
              const isSelected = selectedIds.includes(result.therapist.id)
              const isDisabled = !isSelected && selectedIds.length >= 3
              const pct = Math.min(100, (result.currentWeeklyHours / 15) * 100)

              return (
                <button
                  key={result.therapist.id}
                  onClick={() => !isDisabled && handleTherapistToggle(result)}
                  disabled={isDisabled}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400'
                      : isDisabled
                      ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 bg-white dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                              <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {result.therapist.profile?.full_name ?? result.therapist.email}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                        {result.therapist.city} · {result.therapist.language} · Score {result.therapist.professional_score}
                      </p>

                      {/* Therapist weekly hours bar */}
                      <div className="flex items-center gap-2 mt-1.5 ml-5">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-teal-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {result.currentWeeklyHours.toFixed(1)}/15h
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{result.score}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {result.overlappingSlots.length} slot(s)
                      </span>
                    </div>
                  </div>

                  {result.flags.includes('GENDER_SENSITIVITY_WARNING') && (
                    <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-xs ml-5">
                      <AlertTriangle className="w-3 h-3" />
                      Gender sensitivity note
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedIds.length >= 2 && (
            <Button
              onClick={handleGenerateSchedule}
              disabled={isPending}
              className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
              size="sm"
            >
              {t('generateSchedule')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 3: Distributed Schedule ─── */}
      <Card>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Generating schedule...</p>
          )}

          {hasGenderWarning && scheduleResult?.ok && (
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

          {scheduleResult?.ok && (
            <>
              <div className="space-y-4">
                {scheduleResult.schedule.assignments.map((assignment, ai) => (
                  <div key={assignment.therapist.id}>
                    {ai > 0 && <Separator className="dark:border-gray-700 mb-3" />}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {assignment.therapist.profile?.full_name ?? assignment.therapist.email}
                      </p>
                      <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                        {assignment.weeklyHours}h/week
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {assignment.slots.map((slot, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/25 rounded-lg px-3 py-2 border border-teal-100 dark:border-teal-800"
                        >
                          <Badge variant="outline" className="text-xs min-w-[40px] justify-center dark:border-gray-600 dark:text-gray-300">
                            {DAYS[slot.day_of_week]}
                          </Badge>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {slot.start_time} – {slot.end_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                  {scheduleResult.schedule.totalWeeklyHours}h / week
                </span>
              </div>

              <Separator className="dark:border-gray-700" />
              <Button
                onClick={handleConfirm}
                disabled={isPending}
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
