import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MatchCare',
  description: 'Smart Therapist-Client Allocation Platform',
  icons: { icon: '/Modo-escuro.webp' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value ?? 'light'
  const isDark = themeCookie === 'dark'

  return (
    <html lang="en" className={isDark ? 'dark' : ''} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
