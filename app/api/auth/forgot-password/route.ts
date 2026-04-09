import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

// In production, store reset tokens in database with expiration
// For now, we'll use a simple in-memory store (replace with Redis in production)
const resetTokens = new Map<string, { userId: string; expires: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expires = Date.now() + 3600000 // 1 hour

    resetTokens.set(token, {
      userId: user.id,
      expires,
    })

    // TODO: Send email with reset link
    // const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    // await sendEmail({
    //   to: email,
    //   subject: 'Password Reset',
    //   body: `Click here to reset your password: ${resetLink}`,
    // })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // For development: show token
      ...(process.env.NODE_ENV === 'development' && { token }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
