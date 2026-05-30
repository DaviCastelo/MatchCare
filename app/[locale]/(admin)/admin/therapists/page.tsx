import { getTranslations } from 'next-intl/server'
import { getTherapists, approveTherapist, rejectTherapist } from '@/app/actions/therapists'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function TherapistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { locale } = await params
  const { tab } = await searchParams
  const t = await getTranslations('therapists')
  const tc = await getTranslations('common')
  const therapists = await getTherapists()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const approved = therapists.filter((t) => t.profile?.approved)
  const pending = therapists.filter((t) => !t.profile?.approved)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link href={`/${locale}/admin/therapists/new`}>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus className="w-4 h-4" />{t('new')}
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={tab ?? 'approved'}>
        <TabsList>
          <TabsTrigger value="approved">{t('approved')} ({approved.length})</TabsTrigger>
          <TabsTrigger value="pending">
            {t('pending')} {pending.length > 0 && <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5">{pending.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="space-y-3 mt-4">
          {approved.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">{t('noTherapists')}</CardContent></Card>
          ) : approved.map((therapist) => (
            <Link key={therapist.id} href={`/${locale}/admin/therapists/${therapist.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-700 font-semibold">
                      {(therapist.profile?.full_name ?? therapist.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{therapist.profile?.full_name ?? therapist.email}</p>
                    <p className="text-sm text-gray-500">{therapist.city} · {therapist.years_of_experience}y exp · {therapist.language}</p>
                  </div>
                  <Badge variant="outline">Score {therapist.professional_score}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">No pending approvals</CardContent></Card>
          ) : pending.map((therapist) => (
            <Card key={therapist.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-amber-700 font-semibold">
                    {(therapist.profile?.full_name ?? therapist.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{therapist.profile?.full_name ?? therapist.email}</p>
                  <p className="text-sm text-gray-500">{therapist.email}</p>
                </div>
                <div className="flex gap-2">
                  <form action={async () => {
                    'use server'
                    await approveTherapist(therapist.id, user?.id ?? '')
                  }}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">{tc('approve')}</Button>
                  </form>
                  <form action={async () => {
                    'use server'
                    await rejectTherapist(therapist.id, user?.id ?? '')
                  }}>
                    <Button size="sm" variant="destructive">{tc('reject')}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
