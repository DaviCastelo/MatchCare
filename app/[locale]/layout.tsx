import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Providers } from '@/components/app/providers'
import { HtmlLang } from '@/components/app/html-lang'
import { routing } from '@/i18n/routing'
import { Toaster } from '@/components/ui/sonner'

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

  return (
    <Providers>
      <HtmlLang locale={locale} />
      <NextIntlClientProvider messages={messages}>
        {children}
        <Toaster richColors position="top-right" />
      </NextIntlClientProvider>
    </Providers>
  )
}
