'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListPagination } from '@/components/app/list-pagination'
import { filterTherapists, paginate, type TherapistListFilters } from '@/lib/admin/entity-list'
import { approveTherapist, rejectTherapist } from '@/app/actions/therapists'
import type { Therapist } from '@/lib/types/therapist'
import { Search, X } from 'lucide-react'

type TherapistsAdminListProps = {
  therapists: Therapist[]
  locale: string
  adminUserId: string
  labels: {
    approved: string
    pending: string
    noTherapists: string
    noPending: string
    noResults: string
    searchPlaceholder: string
    clearFilters: string
    sex: string
    city: string
    language: string
    all: string
    male: string
    female: string
    sexNotSet: string
    filter: string
    approve: string
    reject: string
    experience: string
  }
}

function TherapistListContent({
  items,
  locale,
  adminUserId,
  labels,
  showActions,
}: {
  items: Therapist[]
  locale: string
  adminUserId: string
  labels: TherapistsAdminListProps['labels']
  showActions: boolean
}) {
  const [, startTransition] = useTransition()

  function handleApprove(id: string) {
    startTransition(() => approveTherapist(id, adminUserId))
  }

  function handleReject(id: string) {
    startTransition(() => rejectTherapist(id, adminUserId))
  }

  return (
    <div className="grid gap-4">
      {items.map((therapist) => {
        const name = therapist.profile?.full_name ?? therapist.email
        const card = (
          <Card className={showActions ? '' : 'hover:shadow-md hover:ring-teal-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'}>
            <CardContent className="flex items-center gap-4 py-4">
              <Avatar size="lg" className="size-11">
                <AvatarImage src={therapist.profile?.avatar_url ?? undefined} alt={name} />
                <AvatarFallback
                  className={
                    showActions
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-semibold'
                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-semibold'
                  }
                >
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{name}</p>
                <p className="text-sm text-muted-foreground">
                  {therapist.city} · {therapist.years_of_experience}y {labels.experience} · {therapist.language}
                  {therapist.sex ? ` · ${therapist.sex}` : ` · ${labels.sexNotSet}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {therapist.email} · {therapist.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Score {therapist.professional_score}</Badge>
                {showActions && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(therapist.id)}
                    >
                      {labels.approve}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(therapist.id)}
                    >
                      {labels.reject}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )

        return showActions ? (
          <div key={therapist.id}>{card}</div>
        ) : (
          <Link key={therapist.id} href={`/${locale}/admin/therapists/${therapist.id}`}>
            {card}
          </Link>
        )
      })}
    </div>
  )
}

export function TherapistsAdminList({
  therapists,
  locale,
  adminUserId,
  labels,
}: TherapistsAdminListProps) {
  const t = useTranslations('therapists')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const tab = searchParams.get('tab') === 'pending' ? 'pending' : 'approved'

  const filters: TherapistListFilters = {
    q: searchParams.get('q') ?? '',
    sex: searchParams.get('sex') ?? 'all',
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

  const approvedAll = useMemo(
    () => therapists.filter((t) => t.profile?.approved),
    [therapists]
  )
  const pendingAll = useMemo(
    () => therapists.filter((t) => !t.profile?.approved),
    [therapists]
  )

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

  function renderTab(source: Therapist[], showActions: boolean) {
    const filtered = filterTherapists(source, filters)
    const { items, totalPages, total, from, to, page: safePage } = paginate(filtered, page)

    if (source.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {showActions ? labels.noPending : labels.noTherapists}
          </CardContent>
        </Card>
      )
    }

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{labels.noResults}</CardContent>
        </Card>
      )
    }

    return (
      <>
        <TherapistListContent
          items={items}
          locale={locale}
          adminUserId={adminUserId}
          labels={labels}
          showActions={showActions}
        />
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
    )
  }

  const hasActiveFilters =
    Boolean(filters.q) ||
    (filters.sex && filters.sex !== 'all') ||
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
                  updateParams({ q: null, sex: null, language: null, city: null })
                }}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                {labels.clearFilters}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.sex}</Label>
              <Select value={filters.sex || 'all'} onValueChange={(v) => updateParams({ sex: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.all}</SelectItem>
                  <SelectItem value="Male">{labels.male}</SelectItem>
                  <SelectItem value="Female">{labels.female}</SelectItem>
                  <SelectItem value="unset">{labels.sexNotSet}</SelectItem>
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

      <Tabs
        value={tab}
        onValueChange={(v) => updateParams({ tab: v === 'approved' ? null : v })}
      >
        <TabsList>
          <TabsTrigger value="approved">
            {labels.approved} ({approvedAll.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {labels.pending}
            {pendingAll.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5">{pendingAll.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="mt-4 space-y-4">
          {renderTab(approvedAll, false)}
        </TabsContent>
        <TabsContent value="pending" className="mt-4 space-y-4">
          {renderTab(pendingAll, true)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
