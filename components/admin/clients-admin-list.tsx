'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ListPagination } from '@/components/app/list-pagination'
import { filterClients, paginate, type ClientListFilters } from '@/lib/admin/entity-list'
import type { Client } from '@/lib/types/client'
import { Search, User, X } from 'lucide-react'

type ClientsAdminListProps = {
  clients: Client[]
  locale: string
  labels: {
    noClients: string
    behaviorScore: string
    sessionLocation: string
    clinic: string
    school: string
    home: string
    weeklyHours: string
    healthInsurance: string
    searchPlaceholder: string
    clearFilters: string
    noResults: string
    sex: string
    city: string
    language: string
    all: string
    male: string
    female: string
    filter: string
  }
}

export function ClientsAdminList({ clients, locale, labels }: ClientsAdminListProps) {
  const t = useTranslations('clients')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const filters: ClientListFilters = {
    q: searchParams.get('q') ?? '',
    sex: searchParams.get('sex') ?? 'all',
    location: searchParams.get('location') ?? 'all',
    language: searchParams.get('language') ?? '',
    city: searchParams.get('city') ?? '',
  }
  const page = Number(searchParams.get('page') ?? '1') || 1

  const [draftQ, setDraftQ] = useState(filters.q)
  const [draftLanguage, setDraftLanguage] = useState(filters.language ?? '')
  const [draftCity, setDraftCity] = useState(filters.city ?? '')

  function applyFilters() {
    updateParams({
      q: draftQ || null,
      language: draftLanguage || null,
      city: draftCity || null,
    })
  }

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === '' || value === 'all') params.delete(key)
      else params.set(key, value)
    }
    if (resetPage) params.delete('page')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  const filtered = useMemo(() => filterClients(clients, filters), [clients, filters])
  const { items, totalPages, total, from, to, page: safePage } = useMemo(
    () => paginate(filtered, page),
    [filtered, page]
  )

  const hasActiveFilters =
    Boolean(filters.q) ||
    (filters.sex && filters.sex !== 'all') ||
    (filters.location && filters.location !== 'all') ||
    Boolean(filters.language) ||
    Boolean(filters.city)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                placeholder={labels.searchPlaceholder}
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={applyFilters}
            >
              {labels.filter}
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftQ('')
                  setDraftLanguage('')
                  setDraftCity('')
                  updateParams({ q: null, sex: null, location: null, language: null, city: null })
                }}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                {labels.clearFilters}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.sex}</Label>
              <Select
                value={filters.sex || 'all'}
                onValueChange={(v) => updateParams({ sex: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.all}</SelectItem>
                  <SelectItem value="Male">{labels.male}</SelectItem>
                  <SelectItem value="Female">{labels.female}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.sessionLocation}</Label>
              <Select
                value={filters.location || 'all'}
                onValueChange={(v) => updateParams({ location: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.all}</SelectItem>
                  <SelectItem value="Clinic">{labels.clinic}</SelectItem>
                  <SelectItem value="School">{labels.school}</SelectItem>
                  <SelectItem value="Home">{labels.home}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.language}</Label>
              <Input
                value={draftLanguage}
                onChange={(e) => setDraftLanguage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder={labels.language}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.city}</Label>
              <Input
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder={labels.city}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <User className="w-12 h-12 mb-4" />
            <p>{labels.noClients}</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{labels.noResults}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {items.map((client) => (
              <Link key={client.id} href={`/${locale}/admin/clients/${client.id}`}>
                <Card className="hover:shadow-md hover:ring-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar size="lg" className="size-11">
                      <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold text-sm">
                        {client.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{client.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.city} · {client.age}y · {client.language} · {client.sex}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client.parent_phone} · {labels.weeklyHours}: {client.weekly_hours}h
                        {client.health_insurance ? ` · ${client.health_insurance}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant="outline" className="text-xs">
                        {labels.behaviorScore} {client.behavior_score}
                      </Badge>
                      <Badge
                        className={
                          client.preferred_session_location === 'Clinic'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : client.preferred_session_location === 'Home'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                        }
                        variant="secondary"
                      >
                        {client.preferred_session_location}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <ListPagination
            page={safePage}
            totalPages={totalPages}
            from={from}
            to={to}
            total={total}
            onPageChange={(p) => updateParams({ page: String(p) }, false)}
            labels={{
              showing: t('showing', { from, to, total }),
              previous: t('previous'),
              next: t('next'),
              pageOf: t('pageOf', { page: safePage, totalPages }),
            }}
          />
        </>
      )}
    </div>
  )
}
