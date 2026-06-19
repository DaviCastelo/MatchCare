import { TherapistSidebar } from '@/components/app/app-sidebar'
import { AppShell } from '@/components/app/app-shell'

export default async function TherapistLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <AppShell sidebar={<TherapistSidebar locale={locale} />}>
      {children}
    </AppShell>
  )
}
