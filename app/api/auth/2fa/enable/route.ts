import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { generateSecret, generateQrCodeUrl } from '@/lib/totp'
import { z } from 'zod'

const enable2FASchema = z.object({
  password: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = enable2FASchema.parse(body)

    // Verify password (user must re-authenticate to enable 2FA)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, twoFactorEnabled: true },
    })

    if (!user || user.twoFactorEnabled) {
      return NextResponse.json(
        { error: user?.twoFactorEnabled ? '2FA already enabled' : 'Invalid password' },
        { status: 400 }
      )
    }

    // TODO: Verify password here (implement bcrypt.compare)

    // Generate 2FA secret
    const secret = generateSecret()
    const qrCodeUrl = generateQrCodeUrl(secret, session.user.email)

    // Store secret temporarily (user must verify before enabling)
    // In production, use a temporary database table with expiration
    const tempStore = new Map<string, { secret: string; userId: string }>()
    const tempKey = `2fa_temp_${session.user.id}`
    tempStore.set(tempKey, { secret, userId: session.user.id })

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        tempKey,
        message: 'Scan QR code and verify with 2FA code to complete setup',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Enable 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
