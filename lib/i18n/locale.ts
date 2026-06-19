import { routing } from '@/i18n/routing'

export type AppLocale = 'en' | 'pt-BR' | 'es'

export const LOCALE_COOKIE = 'preferred_locale'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value)
}

export function resolveLocale(...candidates: (string | null | undefined)[]): AppLocale {
  for (const candidate of candidates) {
    if (isAppLocale(candidate)) return candidate
  }
  return routing.defaultLocale as AppLocale
}

export function localeFromPathname(pathname: string): AppLocale | null {
  const segment = pathname.split('/').filter(Boolean)[0]
  return isAppLocale(segment) ? segment : null
}

export function localeCookieOptions() {
  return {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
  }
}
