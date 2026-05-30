'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, UserCheck, Shuffle, Calendar,
  RefreshCw, User, Bell, LogOut, Heart,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

type NavItem = { label: string; href: string; icon: React.ReactNode }

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active = pathname.includes(item.href)

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function AdminSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const tc = useTranslations('common')

  const items: NavItem[] = [
    { label: t('dashboard'), href: `/${locale}/admin/dashboard`, icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: t('clients'), href: `/${locale}/admin/clients`, icon: <Users className="w-4 h-4" /> },
    { label: t('therapists'), href: `/${locale}/admin/therapists`, icon: <UserCheck className="w-4 h-4" /> },
    { label: t('match'), href: `/${locale}/admin/match`, icon: <Shuffle className="w-4 h-4" /> },
    { label: t('sessions'), href: `/${locale}/admin/sessions`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('scheduleChange'), href: `/${locale}/admin/schedule-change`, icon: <RefreshCw className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} />
}

export function TherapistSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'), href: `/${locale}/therapist/schedule`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'), href: `/${locale}/therapist/profile`, icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/therapist/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} />
}

export function ParentSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'), href: `/${locale}/parent/schedule`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'), href: `/${locale}/parent/profile`, icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/parent/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <SidebarShell items={items} />
}

function SidebarShell({ items }: { items: NavItem[] }) {
  const tc = useTranslations('common')

  return (
    <aside className="w-64 shrink-0 h-screen border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">{tc('appName')}</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className="p-3 border-t">
        <form action={logout}>
          <Button variant="ghost" type="submit" className="w-full justify-start gap-3 text-gray-600">
            <LogOut className="w-4 h-4" />
            {tc('appName') === 'MatchCare' ? 'Sign Out' : 'Sair'}
          </Button>
        </form>
      </div>
    </aside>
  )
}
