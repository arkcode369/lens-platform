import { NextResponse } from 'next/server'

// Rate limit configuration
interface RateLimitConfig {
  max: number
  windowMs: number
}

const DEFAULT_LIMIT: RateLimitConfig = {
  max: 100,
  windowMs: 60 * 1000, // 1 minute
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/signup': { max: 5, windowMs: 60 * 1000 * 5 }, // 5 per 5 minutes
  '/api/auth/login': { max: 5, windowMs: 60 * 1000 * 5 }, // 5 per 5 minutes
  '/api/auth/forgot-password': { max: 3, windowMs: 60 * 1000 * 60 * 3 }, // 3 per 3 hours
  '/api/auth/2fa/enable': { max: 10, windowMs: 60 * 1000 * 60 * 24 }, // 10 per day
  '/api/auth/2fa/disable': { max: 10, windowMs: 60 * 1000 * 60 * 24 }, // 10 per day
}

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  request: Request,
  endpoint?: string
): Promise<{ success: boolean; remaining: number; resetAt?: number }> {
  const ip = getClientIp(request)
  const key = endpoint ? `${ip}:${endpoint}` : ip

  const config = endpoint ? ENDPOINT_LIMITS[endpoint] || DEFAULT_LIMIT : DEFAULT_LIMIT
  const now = Date.now()

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.max - 1,
      resetAt: now + config.windowMs,
    }
  }

  if (record.count >= config.max) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  // Increment counter
  record.count++
  rateLimitStore.set(key, record)

  return {
    success: true,
    remaining: config.max - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Clean up expired rate limit records
 */
export function cleanupRateLimitRecords(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupRateLimitRecords, 10 * 60 * 1000)

/**
 * Get client IP address from request
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)

  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    },
    { status: 429 }
  )

  response.headers.set('X-RateLimit-Limit', '0')
  response.headers.set('X-RateLimit-Remaining', '0')
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
  response.headers.set('Retry-After', retryAfter.toString())

  return response
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): void {
  response.headers.set('X-RateLimit-Limit', '100')
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
}
