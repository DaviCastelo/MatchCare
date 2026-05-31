'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemTheme() : theme
  root.classList.toggle('dark', resolved === 'dark')
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read stored theme
    const stored = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('theme='))
      ?.split('=')?.[1] as Theme | undefined
    const initial = stored ?? 'system'
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  function cycle() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    applyTheme(next)
  }

  if (!mounted) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'light'  ? <Sun className="w-4 h-4" />     :
       theme === 'dark'   ? <Moon className="w-4 h-4" />    :
                            <Monitor className="w-4 h-4" />}
      <span className="text-sm font-medium">
        {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
      </span>
    </Button>
  )
}
