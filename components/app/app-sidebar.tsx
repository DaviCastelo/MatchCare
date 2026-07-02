'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { MatchCareLogo } from '@/components/app/matchcare-logo'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shuffle,
  Calendar,
  ClipboardList,
  RefreshCw,
  User,
  Bell,
  Settings,
  Sun,
  Moon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { SidebarLogoutMenuItem } from '@/components/app/logout-confirm-button'

type NavItem = { label: string; href: string; icon: React.ReactNode }

function SidebarThemeMenuItem() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('theme='))
      ?.split('=')?.[1]
    const initial = stored === 'dark' ? 'dark' : 'light'
    setTheme(initial)
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`
  }

  if (!mounted) return null

  const label = theme === 'light' ? 'Light' : 'Dark'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggle} tooltip={label}>
        {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarNav({ items, settingsHref }: { items: NavItem[]; settingsHref: string }) {
  const pathname = usePathname()
  const tNav = useTranslations('nav')

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname.includes(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarThemeMenuItem />
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.includes(settingsHref)}
              tooltip={tNav('settings')}
              render={<Link href={settingsHref} />}
            >
              <Settings className="w-4 h-4" />
              <span>{tNav('settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarLogoutMenuItem />
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}

function AppSidebarFrame({ items, settingsHref }: { items: NavItem[]; settingsHref: string }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-center overflow-hidden">
          <MatchCareLogo className="max-w-[160px] group-data-[collapsible=icon]:hidden" />
          <Image
            src="/Modo-escuro.webp"
            alt="MatchCare"
            width={32}
            height={32}
            className="hidden size-8 object-contain group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>
      <SidebarNav items={items} settingsHref={settingsHref} />
      <SidebarRail />
    </Sidebar>
  )
}

export function AdminSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('dashboard'), href: `/${locale}/admin/dashboard`, icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: t('clients'), href: `/${locale}/admin/clients`, icon: <Users className="w-4 h-4" /> },
    { label: t('onboarding'), href: `/${locale}/admin/onboarding`, icon: <ClipboardList className="w-4 h-4" /> },
    { label: t('therapists'), href: `/${locale}/admin/therapists`, icon: <UserCheck className="w-4 h-4" /> },
    { label: t('match'), href: `/${locale}/admin/match`, icon: <Shuffle className="w-4 h-4" /> },
    { label: t('sessions'), href: `/${locale}/admin/sessions`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('scheduleChange'), href: `/${locale}/admin/schedule-change`, icon: <RefreshCw className="w-4 h-4" /> },
  ]

  return <AppSidebarFrame items={items} settingsHref={`/${locale}/admin/settings`} />
}

export function TherapistSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'), href: `/${locale}/therapist/schedule`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'), href: `/${locale}/therapist/profile`, icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/therapist/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <AppSidebarFrame items={items} settingsHref={`/${locale}/therapist/settings`} />
}

export function ParentSidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')

  const items: NavItem[] = [
    { label: t('schedule'), href: `/${locale}/parent/schedule`, icon: <Calendar className="w-4 h-4" /> },
    { label: t('profile'), href: `/${locale}/parent/profile`, icon: <User className="w-4 h-4" /> },
    { label: t('notifications'), href: `/${locale}/parent/notifications`, icon: <Bell className="w-4 h-4" /> },
  ]

  return <AppSidebarFrame items={items} settingsHref={`/${locale}/parent/settings`} />
}
