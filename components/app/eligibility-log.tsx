'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addEligibilityCheck, deleteEligibilityCheck } from '@/app/actions/client-logs'
import type { EligibilityCheck } from '@/lib/types/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const STATUSES = ['Verified', 'Pending', 'Denied'] as const

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Verified') return 'default'
  if (status === 'Denied') return 'destructive'
  return 'secondary'
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function EligibilityLog({
  clientId,
  checks,
}: {
  clientId: string
  checks: EligibilityCheck[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [month, setMonth] = useState(currentMonth())
  const [status, setStatus] = useState<string>('Verified')
  const [refNo, setRefNo] = useState('')
  const [verifiedBy, setVerifiedBy] = useState('')
  const [verifiedOn, setVerifiedOn] = useState('')
  const [notes, setNotes] = useState('')

  function add() {
    if (!month) {
      toast.error('Pick a coverage month')
      return
    }
    startTransition(async () => {
      try {
        await addEligibilityCheck(clientId, {
          check_month: `${month}-01`,
          status,
          reference_no: refNo.trim() || null,
          verified_by: verifiedBy.trim() || null,
          verified_on: verifiedOn || null,
          notes: notes.trim() || null,
        })
        setRefNo('')
        setVerifiedBy('')
        setVerifiedOn('')
        setNotes('')
        setMonth(currentMonth())
        setStatus('Verified')
        router.refresh()
        toast.success('Eligibility check saved')
      } catch {
        toast.error('Could not save check')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteEligibilityCheck(id, clientId)
        router.refresh()
      } catch {
        toast.error('Could not delete check')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eligibility Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add check */}
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Coverage month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? 'Verified')}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Verified on</Label>
              <Input type="date" value={verifiedOn} onChange={(e) => setVerifiedOn(e.target.value)} className="w-40" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1 flex-1 min-w-40">
              <Label className="text-xs text-muted-foreground">Reference #</Label>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Payer ref / call #" />
            </div>
            <div className="space-y-1 flex-1 min-w-40">
              <Label className="text-xs text-muted-foreground">Verified by</Label>
              <Input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Name" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="button" onClick={add} disabled={isPending} size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700">
            <Plus className="w-3 h-3" />
            Add check
          </Button>
        </div>

        {/* Existing checks */}
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No eligibility checks logged yet.</p>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 rounded-md border border-gray-100 dark:border-gray-800 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.check_month.slice(0, 7)}</span>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                    {c.reference_no && <span className="text-muted-foreground">Ref {c.reference_no}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.verified_by && <span>by {c.verified_by}</span>}
                    {c.verified_on && <span>{c.verified_by ? ' · ' : ''}on {c.verified_on}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <Button
                  onClick={() => remove(c.id)}
                  disabled={isPending}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
