import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { verifyTotp } from '@/lib/totp'
import { z } from 'zod'

const verify2FASchema = z.object({
  code: z.string().length(6),
  tempKey: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, tempKey } = verify2FASchema.parse(body)

    // Get temp secret
    const tempStore = new Map<string, { secret: string; userId: string }>()
    const tempData = tempStore.get(tempKey)

    if (!tempData || tempData.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid or expired temporary key' },
        { status: 400 }
      )
    }

    // Verify 2FA code
    const isValid = verifyTotp(tempData.secret, code)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 400 }
      )
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: tempData.secret,
        twoFactorEnabled: true,
      },
    })

    // Clean up temp store
    tempStore.delete(tempKey)

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Verify 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
