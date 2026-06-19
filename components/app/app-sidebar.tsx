'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MatchCareLogo } from '@/components/app/matchcare-logo'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, UserCheck, Shuffle, Calendar,
  RefreshCw, User, Bell, LogOut, Settings,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'

type NavItem = { label: string; href: string; icon: React.ReactNode }

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active = pathname.includes(item.href)

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        active
          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
      )}
    >
      {/* active accent bar */}
      <span
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-teal-500 transition-all duration-200',
          active ? 'opacity-100' : 'opacity-0 -translate-x-1'
        )}
      />
      <span className="transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
      {item.label}
    </Link>
  )
}

function SidebarShell({
  items,
  settingsHref,
}: {
  items: NavItem[]
  settingsHref: string
}) {
  const t = useTranslations('common')
  const tNav = useTranslations('nav')
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 h-screen border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <MatchCareLogo className="max-w-[180px]" />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
        <ThemeToggle />
        <Link
          href={settingsHref}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
            pathname.includes(settingsHref)
              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          )}
        >
          <Settings className="w-4 h-4" />
          {tNav('settings')}
        </Link>
        <form action={logout}>
          <Button
            variant="ghost"
            type="submit"
            className="group w-full justify-start gap-3 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {t('signOut')}
          </Button>
        </form>
      </div>
    </aside>
  )
}

export function AdminSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('dashboard'),     href: `/${locale}/admin/dashboard`,       icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: t('clients'),       href: `/${locale}/admin/clients`,         icon: <Users className="w-4 h-4" /> },
    { label: t('therapists'),    href: `/${locale}/admin/therapists`,      icon: <UserCheck className="w-4 h-4" /> },
    { label: t('match'),         href: `/${locale}/admin/match`,           icon: <Shuffle className="w-4 h-4" /> },
    { label: t('sessions'),      href: `/${locale}/admin/sessions`,        icon: <Calendar className="w-4 h-4" /> },
    { label: t('scheduleChange'),href: `/${locale}/admin/schedule-change`, icon: <RefreshCw className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} settingsHref={`/${locale}/admin/settings`} />
}

export function TherapistSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'),      href: `/${locale}/therapist/schedule`,      icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'),       href: `/${locale}/therapist/profile`,       icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/therapist/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} settingsHref={`/${locale}/therapist/settings`} />
}

export function ParentSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'),      href: `/${locale}/parent/schedule`,      icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'),       href: `/${locale}/parent/profile`,       icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/parent/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} settingsHref={`/${locale}/parent/settings`} />
}
