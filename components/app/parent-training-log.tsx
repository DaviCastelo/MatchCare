'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addParentTrainingEntry,
  deleteParentTrainingEntry,
} from '@/app/actions/client-logs'
import type { ParentTrainingEntry } from '@/lib/types/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function ParentTrainingLog({
  clientId,
  entries,
  targetHours,
}: {
  clientId: string
  entries: ParentTrainingEntry[]
  targetHours: number | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [date, setDate] = useState(today())
  const [hours, setHours] = useState('1')
  const [topic, setTopic] = useState('')
  const [providedBy, setProvidedBy] = useState('')
  const [notes, setNotes] = useState('')

  const logged = entries.reduce((sum, e) => sum + Number(e.hours ?? 0), 0)

  function add() {
    const h = Number(hours)
    if (!date || Number.isNaN(h) || h < 0) {
      toast.error('Enter a valid date and hours')
      return
    }
    startTransition(async () => {
      try {
        await addParentTrainingEntry(clientId, {
          session_date: date,
          hours: h,
          topic: topic.trim() || null,
          provided_by: providedBy.trim() || null,
          notes: notes.trim() || null,
        })
        setTopic('')
        setProvidedBy('')
        setNotes('')
        setHours('1')
        setDate(today())
        router.refresh()
        toast.success('Session logged')
      } catch {
        toast.error('Could not save session')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteParentTrainingEntry(id, clientId)
        router.refresh()
      } catch {
        toast.error('Could not delete session')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Parent Training</span>
          <span className="text-sm font-normal text-muted-foreground">
            {logged}h logged{targetHours != null ? ` / ${targetHours}h target` : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add entry */}
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hours</Label>
              <Input
                type="number"
                min={0}
                step={0.25}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-40">
              <Label className="text-xs text-muted-foreground">Provided by</Label>
              <Input value={providedBy} onChange={(e) => setProvidedBy(e.target.value)} placeholder="BCBA / name" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Reinforcement strategies" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="button" onClick={add} disabled={isPending} size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700">
            <Plus className="w-3 h-3" />
            Log session
          </Button>
        </div>

        {/* Existing entries */}
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sessions logged yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-md border border-gray-100 dark:border-gray-800 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{e.session_date}</span>
                    <span className="text-teal-600 dark:text-teal-400">{Number(e.hours)}h</span>
                    {e.provided_by && <span className="text-muted-foreground">· {e.provided_by}</span>}
                  </div>
                  {e.topic && <p className="text-sm text-gray-700 dark:text-gray-300">{e.topic}</p>}
                  {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                </div>
                <Button
                  onClick={() => remove(e.id)}
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
