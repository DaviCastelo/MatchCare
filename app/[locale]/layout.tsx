import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Providers } from '@/components/app/providers'
import { routing } from '@/i18n/routing'
import { Toaster } from '@/components/ui/sonner'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MatchCare',
  description: 'Smart Therapist-Client Allocation Platform',
  icons: { icon: '/Modo-escuro.webp' },
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'en' | 'pt-BR' | 'es')) {
    notFound()
  }

  const messages = await getMessages()

  // Read theme from cookie to apply class server-side (no flash)
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value ?? 'light'
  const isDark = themeCookie === 'dark'

  return (
    <html lang={locale} className={isDark ? 'dark' : ''} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster richColors position="top-right" />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  )
}
