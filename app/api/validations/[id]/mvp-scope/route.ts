import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'
import { mvpScooper } from '@/lib/mvp-scoper'

const createMvpScopeSchema = z.object({
  recommendedFeatures: z.array(z.object({
    name: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    rationale: z.string(),
    effort: z.string(),
    dependencies: z.array(z.string()).optional(),
  })).optional(),
  buildVsBuy: z.object({
    build: z.array(z.string()).optional(),
    buy: z.array(z.string()).optional(),
    integrate: z.array(z.string()).optional(),
  }).optional(),
  totalEffort: z.string().optional(),
  risks: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
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
    
    // Check if auto-scope is requested
    if (body.autoScope) {
      console.log(`Auto-scoping MVP for validation ${validationId}`)
      
      const validation = await prisma.validation.findFirst({
        where: {
          id: validationId,
          userId: session.user.id,
        },
      })

      if (!validation) {
        return NextResponse.json({ error: 'Validation not found' }, { status: 404 })
      }

      // Extract features from idea description
      const proposedFeatures = extractFeaturesFromIdea(validation.ideaDescription)

      // Generate MVP scope
      const mvpData = await mvpScooper.scope(
        validation.ideaDescription,
        validation.targetAudience || 'General users',
        extractProblem(validation.ideaDescription),
        proposedFeatures
      )

      // Save to database
      const mvpScope = await prisma.mvpScope.upsert({
        where: { validationId },
        create: {
          validationId,
          recommendedFeatures: mvpData.recommendedFeatures,
          buildVsBuy: mvpData.buildVsBuy,
          totalEffort: mvpData.totalEffort.timeline,
          risks: mvpData.risks.map(r => r.description),
        },
        update: {
          recommendedFeatures: mvpData.recommendedFeatures,
          buildVsBuy: mvpData.buildVsBuy,
          totalEffort: mvpData.totalEffort.timeline,
          risks: mvpData.risks.map(r => r.description),
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ 
        success: true, 
        data: mvpScope,
        timeline: mvpData.timeline,
        risks: mvpData.risks
      })
    }

    // Manual input
    const data = createMvpScopeSchema.parse(body)

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

    // Upsert MVP scope
    const mvpScope = await prisma.mvpScope.upsert({
      where: { validationId },
      create: {
        validationId,
        ...data,
      },
      update: data,
    })

    return NextResponse.json({ success: true, data: mvpScope })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('MVP scope error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractFeaturesFromIdea(idea: string): string[] {
  // Simple feature extraction based on common patterns
  const featurePatterns = [
    /(?:dashboard|analytics|reporting)/gi,
    /(?:user|account|profile)/gi,
    /(?:integration|api|connect)/gi,
    /(?:payment|billing|subscription)/gi,
    /(?:search|filter|sort)/gi,
    /(?:notification|alert|reminder)/gi,
    /(?:export|import|sync)/gi,
    /(?:mobile|responsive|app)/gi,
  ]

  const features: string[] = []
  
  for (const pattern of featurePatterns) {
    const match = idea.match(pattern)
    if (match) {
      features.push(match[0])
    }
  }

  // Add default core features if none found
  if (features.length === 0) {
    return [
      'User authentication',
      'Core functionality',
      'Dashboard',
      'Settings'
    ]
  }

  return features.slice(0, 10)
}

function extractProblem(idea: string): string {
  // Extract problem statement (first 100 chars or until period)
  const sentences = idea.split(/[.!?]/)
  return sentences[0]?.substring(0, 200) || idea.substring(0, 200)
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

    const mvpScope = await prisma.mvpScope.findUnique({
      where: { validationId },
    })

    if (!mvpScope) {
      return NextResponse.json({ error: 'MVP scope not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: mvpScope })
  } catch (error) {
    console.error('Get MVP scope error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
