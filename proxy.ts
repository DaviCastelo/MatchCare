import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { createServerClient } from '@supabase/ssr'
import { LOCALE_COOKIE, localeFromPathname, resolveLocale } from './lib/i18n/locale'

const intlMiddleware = createMiddleware(routing)

const PUBLIC_PATHS = ['/login', '/register', '/pending-approval']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.endsWith(p))
}

function localeFromRequest(request: NextRequest): string {
  return resolveLocale(
    localeFromPathname(request.nextUrl.pathname),
    request.cookies.get(LOCALE_COOKIE)?.value
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameWithoutLocale = pathname.replace(/^\/(en|pt-BR|es)/, '') || '/'

  const response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublicPath(pathnameWithoutLocale)) {
    const locale = localeFromRequest(request)
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'therapist' && !profile.approved) {
      if (!pathnameWithoutLocale.startsWith('/pending-approval')) {
        const locale = localeFromRequest(request)
        return NextResponse.redirect(new URL(`/${locale}/pending-approval`, request.url))
      }
      return response
    }

    if (isPublicPath(pathnameWithoutLocale)) {
      const locale = localeFromRequest(request)
      const dest = profile?.role === 'admin'
        ? `/${locale}/admin/dashboard`
        : profile?.role === 'therapist'
        ? `/${locale}/therapist/schedule`
        : `/${locale}/parent/schedule`
      return NextResponse.redirect(new URL(dest, request.url))
    }

    if (pathnameWithoutLocale.startsWith('/admin') && profile?.role !== 'admin') {
      const locale = localeFromRequest(request)
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    if (pathnameWithoutLocale.startsWith('/therapist') && profile?.role !== 'therapist') {
      const locale = localeFromRequest(request)
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    if (pathnameWithoutLocale.startsWith('/parent') && profile?.role !== 'parent') {
      const locale = localeFromRequest(request)
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
