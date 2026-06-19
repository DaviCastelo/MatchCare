'use client'

import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { localeFromPathname } from '@/lib/i18n/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  localeHint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localeHint?: string
}) {
  const t = useTranslations('common')
  const tAuth = useTranslations('auth')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await logout(localeHint)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{tAuth('logoutConfirmTitle')}</DialogTitle>
          <DialogDescription>{tAuth('logoutConfirmDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? t('loading') : t('signOut')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SidebarLogoutMenuItem() {
  const t = useTranslations('common')
  const pathname = usePathname()
  const localeHint = localeFromPathname(pathname) ?? undefined
  const [open, setOpen] = useState(false)

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setOpen(true)} tooltip={t('signOut')}>
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <LogoutConfirmDialog open={open} onOpenChange={setOpen} localeHint={localeHint} />
    </>
  )
}

export function LogoutConfirmButton({
  className,
  variant = 'outline',
}: {
  className?: string
  variant?: 'outline' | 'ghost' | 'default'
}) {
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  const localeHint = localeFromPathname(pathname) ?? undefined
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        {tAuth('logout')}
      </Button>
      <LogoutConfirmDialog open={open} onOpenChange={setOpen} localeHint={localeHint} />
    </>
  )
}
