'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Camera } from 'lucide-react'
import { uploadAvatar } from '@/app/actions/profile'
import { toast } from 'sonner'

export function AvatarUpload({
  currentUrl,
  name,
}: {
  currentUrl?: string | null
  name: string
}) {
  const t = useTranslations('profile')
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    const fd = new FormData()
    fd.set('avatar', file)
    startTransition(async () => {
      try {
        await uploadAvatar(fd)
        toast.success(t('photoUpdated'))
      } catch (err) {
        setPreview(null)
        toast.error(err instanceof Error ? err.message : t('photoError'))
      }
    })
  }

  const initial = (name || '?').charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16 ring-2 ring-teal-500/20">
        <AvatarImage src={preview ?? currentUrl ?? undefined} alt={name} />
        <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-lg font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={onFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-4 h-4" />
          {isPending ? t('uploading') : t('changePhoto')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('photoHint')}</p>
      </div>
    </div>
  )
}
