import { getTranslations } from 'next-intl/server'
import {
  getAdminSessionsByClient,
  getAdminSessionsByTherapist,
  getClientsAndTherapistsForSessionForm,
} from '@/app/actions/sessions'
import { AdminSessionsTable } from '@/components/sessions/admin-sessions-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { locale } = await params
  const { tab } = await searchParams
  const t = await getTranslations('sessions')
  const tc = await getTranslations('common')

  const [clientSessions, therapistSessions, formOptions] = await Promise.all([
    getAdminSessionsByClient(),
    getAdminSessionsByTherapist(),
    getClientsAndTherapistsForSessionForm(),
  ])

  const clients = formOptions.clients.map((c) => ({
    id: c.id,
    name: c.full_name,
    city: c.city,
  }))

  const therapists = formOptions.therapists.map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
  }))

  const uniqueClientCount = new Set(clientSessions.map((s) => s.client_id)).size
  const uniqueTherapistCount = new Set(therapistSessions.map((s) => s.therapist_id)).size

  const tableLabels = {
    searchPlaceholder: t('searchPlaceholder'),
    client: t('client'),
    therapist: t('therapist'),
    day: t('day'),
    time: t('time'),
    location: t('location'),
    status: t('status'),
    active: t('active'),
    cancelled: t('cancelled'),
    rescheduled: t('rescheduled'),
    noSessions: t('noSessions'),
    newSession: t('newSession'),
    createTitle: t('createSession'),
    editTitle: t('editSession'),
    startTime: t('startTime'),
    endTime: t('endTime'),
    recurrenceStart: t('recurrenceStart'),
    recurrenceEnd: t('recurrenceEnd'),
    save: tc('save'),
    cancel: tc('cancel'),
    delete: tc('delete'),
    clinic: t('clinic'),
    school: t('school'),
    home: t('home'),
    all: t('all'),
    actions: t('actions'),
    city: tc('city'),
    confirmDelete: t('confirmDelete'),
    confirmDeleteDesc: t('confirmDeleteDesc'),
    days: t.raw('days') as string[],
    validation: {
      endBeforeStart: t('validation.endBeforeStart'),
      outsideClinicHours: t('validation.outsideClinicHours'),
      homeCityMismatch: t('validation.homeCityMismatch'),
      therapistConflict: t('validation.therapistConflict'),
      clientConflict: t('validation.clientConflict'),
    },
    sessionsCount: t.raw('sessionsCount') as string,
    sessionsColumn: t('sessionsColumn'),
    linkedTherapists: t('linkedTherapists'),
    linkedClients: t('linkedClients'),
    expandSessions: t('expandSessions'),
    collapseSessions: t('collapseSessions'),
    showCalendar: t('showCalendar'),
    hideCalendar: t('hideCalendar'),
    previousMonth: t('previousMonth'),
    nextMonth: t('nextMonth'),
    daySheetTitle: t('daySheetTitle'),
    noSessionsOnDay: t('noSessionsOnDay'),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>

      <Tabs defaultValue={tab ?? 'client'}>
        <TabsList>
          <TabsTrigger value="client">
            {t('byClient')} ({uniqueClientCount})
          </TabsTrigger>
          <TabsTrigger value="therapist">
            {t('byTherapist')} ({uniqueTherapistCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="mt-4">
          <AdminSessionsTable
            sessions={clientSessions}
            clients={clients}
            therapists={therapists}
            perspective="client"
            locale={locale}
            labels={tableLabels}
          />
        </TabsContent>

        <TabsContent value="therapist" className="mt-4">
          <AdminSessionsTable
            sessions={therapistSessions}
            clients={clients}
            therapists={therapists}
            perspective="therapist"
            locale={locale}
            labels={tableLabels}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
