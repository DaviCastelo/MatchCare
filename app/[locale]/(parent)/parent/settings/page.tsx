import { getTranslations } from 'next-intl/server'
import { getUserSettings, saveUserSettings } from '@/app/actions/settings'
import { SettingsPanel } from '@/components/app/settings-panel'
import { Settings } from 'lucide-react'

export default async function ParentSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('nav')
  const settings = await getUserSettings()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings')}</h1>
      </div>
      <SettingsPanel
        currentLocale={locale}
        savedLanguage={settings.preferred_language}
        onSave={saveUserSettings}
      />
    </div>
  )
}
