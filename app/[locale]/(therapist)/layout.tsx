import { TherapistSidebar } from '@/components/app/app-sidebar'

export default async function TherapistLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <TherapistSidebar locale={locale} />
      <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-950">{children}</main>
    </div>
  )
}
