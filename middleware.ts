import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, createRateLimitResponse } from '@/lib/rate-limit'

// Routes to exclude from rate limiting
const EXCLUDED_PATHS = [
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/api/billing/webhooks', // Webhooks have their own auth
]

// Routes to exclude from authentication
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/2fa/enable',
  '/api/auth/2fa/verify',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Exclude static files and webhooks from rate limiting
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    const limit = await rateLimit(request, pathname)

    if (!limit.success) {
      return createRateLimitResponse(limit.resetAt!)
    }

    const response = NextResponse.next()
    addRateLimitHeaders(response, limit.remaining, limit.resetAt!)
    return response
  }

  // Check authentication for protected routes
  if (!PUBLIC_PATHS.includes(pathname)) {
    const sessionCookie = request.cookies.get('session')

    if (!sessionCookie) {
      // Redirect to sign in if not authenticated
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
        const signInUrl = new URL('/sign-in', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }
    }
  }

  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  )
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting:
     * - api/billing/webhooks (Stripe webhooks need raw body)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/billing/webhooks|_next/static|_next/image|favicon.ico).*)',
  ],
}

function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): void {
  response.headers.set('X-RateLimit-Limit', '100')
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
}
