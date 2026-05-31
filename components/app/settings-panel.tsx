'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe, Check, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'

type Theme = 'light' | 'dark'

const LANGUAGES = [
  { code: 'en',    label: 'English',            badge: 'EN', color: 'bg-blue-600' },
  { code: 'pt-BR', label: 'Português (Brasil)', badge: 'PT', color: 'bg-green-600' },
  { code: 'es',    label: 'Español',            badge: 'ES', color: 'bg-yellow-600' },
]

function getThemeCookie(): Theme {
  if (typeof document === 'undefined') return 'light'
  const value = document.cookie.split(';').find(c => c.trim().startsWith('theme='))?.split('=')?.[1]
  return value === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`
}

export function SettingsPanel({
  currentLocale,
  savedLanguage,
  onSave,
}: {
  currentLocale: string
  savedLanguage: string
  onSave: (lang: string) => Promise<void>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedLang, setSelectedLang] = useState(savedLanguage || currentLocale)
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setTheme(getThemeCookie())
    setMounted(true)
  }, [])

  function handleTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await onSave(selectedLang)
        if (selectedLang !== currentLocale) {
          const newPath = pathname.replace(/^\/(en|pt-BR|es)/, `/${selectedLang}`)
          router.push(newPath)
          router.refresh()
        }
        toast.success(
          selectedLang === 'pt-BR' ? 'Configurações salvas!' :
          selectedLang === 'es'    ? '¡Configuración guardada!' :
          'Settings saved!'
        )
      } catch {
        toast.error('Failed to save settings')
      }
    })
  }

  const labels = {
    language:  currentLocale === 'pt-BR' ? 'Idioma do sistema' : currentLocale === 'es' ? 'Idioma del sistema' : 'System Language',
    langDesc:  currentLocale === 'pt-BR' ? 'Cada usuário pode ter um idioma diferente.' : currentLocale === 'es' ? 'Cada usuario puede tener un idioma diferente.' : 'Each user can have a different language.',
    appearance: currentLocale === 'pt-BR' ? 'Aparência' : currentLocale === 'es' ? 'Apariencia' : 'Appearance',
    light:  currentLocale === 'pt-BR' ? 'Claro'  : currentLocale === 'es' ? 'Claro'   : 'Light',
    dark:   currentLocale === 'pt-BR' ? 'Escuro' : currentLocale === 'es' ? 'Oscuro'  : 'Dark',
    save:   currentLocale === 'pt-BR' ? 'Salvar alterações' : currentLocale === 'es' ? 'Guardar cambios' : 'Save changes',
    saving: currentLocale === 'pt-BR' ? 'Salvando...' : currentLocale === 'es' ? 'Guardando...' : 'Saving...',
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600" />
            {labels.language}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{labels.langDesc}</p>
          <div className="grid grid-cols-1 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left w-full ${
                  selectedLang === lang.code
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className={`w-9 h-9 rounded-lg ${lang.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {lang.badge}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lang.label}</span>
                {selectedLang === lang.code && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      {mounted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-teal-600" />
              {labels.appearance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'light', icon: <Sun className="w-5 h-5" />, label: labels.light },
                { value: 'dark', icon: <Moon className="w-5 h-5" />, label: labels.dark },
              ] as { value: Theme; icon: React.ReactNode; label: string }[]).map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === value
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-400 text-teal-700 dark:text-teal-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={isPending} className="bg-teal-600 hover:bg-teal-700 w-full">
        {isPending ? labels.saving : labels.save}
      </Button>
    </div>
  )
}
