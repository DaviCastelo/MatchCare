import { AdminSidebar } from '@/components/app/app-sidebar'
import { AppShell } from '@/components/app/app-shell'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <AppShell sidebar={<AdminSidebar locale={locale} />}>
      {children}
    </AppShell>
  )
}
