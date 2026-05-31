'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { runMatch, getScheduleForTherapist, confirmMatch } from '@/app/actions/match'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, Star, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@/lib/types/client'
import type { MatchOutput, MatchResult, ScheduleResult } from '@/lib/types/matching'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MatchTool({ clients, locale }: { clients: Client[]; locale: string }) {
  const t = useTranslations('match')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [matchOutput, setMatchOutput] = useState<MatchOutput | null>(null)
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null)
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId)
    setMatchOutput(null)
    setSelectedResult(null)
    setScheduleResult(null)
    setOpen(false)

    startTransition(async () => {
      const output = await runMatch(clientId)
      setMatchOutput(output)
    })
  }

  function handleTherapistSelect(result: MatchResult) {
    setSelectedResult(result)
    setScheduleResult(null)

    startTransition(async () => {
      const schedule = await getScheduleForTherapist(selectedClientId, result.therapist.id)
      setScheduleResult(schedule)
    })
  }

  function handleConfirm() {
    if (!scheduleResult || !selectedResult) return

    startTransition(async () => {
      try {
        await confirmMatch(selectedClientId, selectedResult.therapist.id, scheduleResult)
        toast.success(t('matchSuccess'))
        setMatchOutput(null)
        setSelectedResult(null)
        setScheduleResult(null)
        setSelectedClientId('')
      } catch (e: unknown) {
        toast.error(e instanceof Error && e.message === 'CONFLICT' ? t('conflictError') : t('conflictError'))
      }
    })
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

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
          {/* Custom dropdown to avoid Base UI Select showing UUID */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <span className={selectedClient ? '' : 'text-gray-400 dark:text-gray-500'}>
                {selectedClient ? `${selectedClient.full_name} — Score ${selectedClient.behavior_score}` : t('selectClient')}
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

      {/* ─── Step 2: Eligible Therapists ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
            {t('eligibleTherapists')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {!matchOutput && !isPending && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('selectClient')}</p>
          )}

          {matchOutput?.eligible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t('noEligible')}</p>
          )}

          {matchOutput?.eligible.map((result) => (
            <button
              key={result.therapist.id}
              onClick={() => handleTherapistSelect(result)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${
                selectedResult?.therapist.id === result.therapist.id
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 bg-white dark:bg-gray-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {result.therapist.profile?.full_name ?? result.therapist.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{result.therapist.city} · {result.therapist.language}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.overlappingSlots.length} slot(s) · Score {result.therapist.professional_score}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{result.score}</span>
                </div>
              </div>
              {result.flags.includes('GENDER_SENSITIVITY_WARNING') && (
                <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Gender sensitivity note
                </div>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ─── Step 3: Schedule ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">3</span>
            {t('proposedSchedule')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedResult && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('selectTherapist')}</p>
          )}

          {selectedResult && isPending && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Generating schedule...</p>
          )}

          {selectedResult?.flags.includes('GENDER_SENSITIVITY_WARNING') && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">{t('genderWarning')}</AlertDescription>
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
              <div className="space-y-2">
                {scheduleResult.schedule.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/25 rounded-lg px-3 py-2 border border-teal-100 dark:border-teal-800">
                    <Badge variant="outline" className="text-xs min-w-[40px] justify-center dark:border-gray-600 dark:text-gray-300">
                      {DAYS[slot.day_of_week]}
                    </Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>
                ))}
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
