import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

const createLandingPageSchema = z.object({
  title: z.string().min(1).max(200),
  headline: z.string().min(1).max(500),
  subheadline: z.string().max(1000).optional(),
  features: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    order: z.number().optional(),
  })).optional(),
  testimonials: z.array(z.object({
    name: z.string(),
    role: z.string(),
    quote: z.string(),
    avatar: z.string().url().optional(),
  })).optional(),
  ctaText: z.string().default('Get Started'),
  ctaLink: z.string().url().optional(),
  sections: z.array(z.object({
    type: z.string(),
    content: z.any(),
    order: z.number().optional(),
  })).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validationId = params.id
    const body = await request.json()
    
    // Validate input
    const data = createLandingPageSchema.parse(body)

    // Verify user owns this validation
    const validation = await prisma.validation.findFirst({
      where: {
        id: validationId,
        userId: session.user.id,
      },
    })

    if (!validation) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 })
    }

    // Create landing page
    const landingPage = await prisma.landingPage.create({
      data: {
        validationId,
        ...data,
      },
    })

    return NextResponse.json({ success: true, data: landingPage }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create landing page error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validationId = params.id

    // Verify user owns this validation
    const validation = await prisma.validation.findFirst({
      where: {
        id: validationId,
        userId: session.user.id,
      },
    })

    if (!validation) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 })
    }

    const landingPages = await prisma.landingPage.findMany({
      where: { validationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: landingPages })
  } catch (error) {
    console.error('Get landing pages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
