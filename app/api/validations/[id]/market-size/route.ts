import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'
import { marketSizer } from '@/lib/market-sizer'

const createMarketSizeSchema = z.object({
  tam: z.number().optional(),
  sam: z.number().optional(),
  som: z.number().optional(),
  growthRate: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  sources: z.array(z.object({
    name: z.string(),
    url: z.string().url().optional(),
    date: z.string(),
    metric: z.string().optional(),
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
    
    // Check if auto-calculate is requested
    if (body.autoCalculate) {
      console.log(`Auto-calculating market size for validation ${validationId}`)
      
      const validation = await prisma.validation.findFirst({
        where: {
          id: validationId,
          userId: session.user.id,
        },
      })

      if (!validation) {
        return NextResponse.json({ error: 'Validation not found' }, { status: 404 })
      }

      // Calculate market size
      const marketSizeData = await marketSizer.calculate(
        validation.industry || 'Technology',
        validation.targetAudience || 'General consumers',
        'global'
      )

      // Save to database
      const marketSize = await prisma.marketSize.upsert({
        where: { validationId },
        create: {
          validationId,
          tam: marketSizeData.tam,
          sam: marketSizeData.sam,
          som: marketSizeData.som,
          growthRate: marketSizeData.growthRate,
          confidence: marketSizeData.confidence,
          sources: marketSizeData.sources,
        },
        update: {
          tam: marketSizeData.tam,
          sam: marketSizeData.sam,
          som: marketSizeData.som,
          growthRate: marketSizeData.growthRate,
          confidence: marketSizeData.confidence,
          sources: marketSizeData.sources,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ 
        success: true, 
        data: marketSize,
        calculations: marketSizeData.calculations
      })
    }

    // Manual input
    const data = createMarketSizeSchema.parse(body)

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

    // Upsert market size
    const marketSize = await prisma.marketSize.upsert({
      where: { validationId },
      create: {
        validationId,
        ...data,
      },
      update: data,
    })

    return NextResponse.json({ success: true, data: marketSize })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Market size error:', error)
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

    const marketSize = await prisma.marketSize.findUnique({
      where: { validationId },
    })

    if (!marketSize) {
      return NextResponse.json({ error: 'Market size not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: marketSize })
  } catch (error) {
    console.error('Get market size error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
