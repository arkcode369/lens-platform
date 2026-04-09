import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

const disable2FASchema = z.object({
  code: z.string().length(6),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, password } = disable2FASchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true, passwordHash: true },
    })

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA not enabled' },
        { status: 400 }
      )
    }

    // Verify 2FA code
    const isValid = verifyTotp(user.twoFactorSecret, code)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 400 }
      )
    }

    // TODO: Verify password

    // Disable 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Disable 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
