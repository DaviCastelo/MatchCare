import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { createServerClient } from '@supabase/ssr'

const intlMiddleware = createMiddleware(routing)

const PUBLIC_PATHS = ['/login', '/register', '/pending-approval']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.endsWith(p))
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
    const locale = pathname.split('/')[1] || 'en'
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
        const locale = pathname.split('/')[1] || 'en'
        return NextResponse.redirect(new URL(`/${locale}/pending-approval`, request.url))
      }
      return response
    }

    if (isPublicPath(pathnameWithoutLocale)) {
      const locale = pathname.split('/')[1] || 'en'
      const dest = profile?.role === 'admin'
        ? `/${locale}/admin/dashboard`
        : profile?.role === 'therapist'
        ? `/${locale}/therapist/schedule`
        : `/${locale}/parent/schedule`
      return NextResponse.redirect(new URL(dest, request.url))
    }

    if (pathnameWithoutLocale.startsWith('/admin') && profile?.role !== 'admin') {
      const locale = pathname.split('/')[1] || 'en'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    if (pathnameWithoutLocale.startsWith('/therapist') && profile?.role !== 'therapist') {
      const locale = pathname.split('/')[1] || 'en'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    if (pathnameWithoutLocale.startsWith('/parent') && profile?.role !== 'parent') {
      const locale = pathname.split('/')[1] || 'en'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
