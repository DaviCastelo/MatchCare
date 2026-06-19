import { ParentSidebar } from '@/components/app/app-sidebar'
import { AppShell } from '@/components/app/app-shell'

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <AppShell sidebar={<ParentSidebar locale={locale} />}>
      {children}
    </AppShell>
  )
}
