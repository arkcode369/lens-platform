import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
})

// In-memory store (replace with database in production)
const resetTokens = new Map<string, { userId: string; expires: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Validate token
    const tokenData = resetTokens.get(token)
    if (!tokenData || tokenData.expires < Date.now()) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update user password
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    })

    // Invalidate token
    resetTokens.delete(token)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
