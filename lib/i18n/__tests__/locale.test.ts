import { describe, it, expect } from 'vitest'
import { isAppLocale, resolveLocale, localeFromPathname } from '../locale'

describe('locale helpers', () => {
  it('validates supported locales', () => {
    expect(isAppLocale('pt-BR')).toBe(true)
    expect(isAppLocale('fr')).toBe(false)
  })

  it('resolves first valid locale candidate', () => {
    expect(resolveLocale('fr', 'pt-BR', 'en')).toBe('pt-BR')
    expect(resolveLocale(null, undefined, 'es')).toBe('es')
    expect(resolveLocale('invalid')).toBe('en')
  })

  it('reads locale from pathname', () => {
    expect(localeFromPathname('/pt-BR/admin/clients')).toBe('pt-BR')
    expect(localeFromPathname('/login')).toBeNull()
  })
})
