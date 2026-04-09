import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { createSession } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  code: z.string().optional(), // 2FA code if enabled
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, code } = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!code) {
        return NextResponse.json(
          { error: '2FA required', requires2fa: true },
          { status: 401 }
        )
      }

      // Verify 2FA code
      const isCodeValid = verifyTotp(user.twoFactorSecret, code)
      if (!isCodeValid) {
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 401 }
        )
      }
    }

    // Create session
    const session = await createSession(user.id)

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      },
    })

    // Set session cookie
    response.cookies.set('session', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
