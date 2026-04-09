import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { competitorDiscoverer } from "@/lib/competitor-discoverer"

const prisma = new PrismaClient()

const competitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  features: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(["existing", "planned", "missing"]).optional()
  })).optional(),
  pricing: z.array(z.object({
    plan: z.string(),
    price: z.number(),
    currency: z.string().default("USD")
  })).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify validation ownership
    const validation = await prisma.validation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!validation) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 })
    }

    const body = await request.json()

    // If auto-discover flag is set, run competitor discovery
    if (body.autoDiscover) {
      console.log(`Starting auto-discovery for validation ${params.id}`)
      
      const keywords = extractKeywords(validation.ideaDescription)
      const discoveryResult = await competitorDiscoverer.discover(
        validation.ideaDescription,
        keywords
      )

      // Store competitors in database
      const createdCompetitors = await Promise.all(
        discoveryResult.competitors.slice(0, 15).map(competitor =>
          prisma.competitor.create({
            data: {
              validationId: params.id,
              name: competitor.name,
              url: competitor.url,
              description: competitor.description,
              features: competitor.features,
              pricing: competitor.pricing,
              strengths: competitor.strengths,
              weaknesses: competitor.weaknesses,
              swot: competitor.swot
            }
          })
        )
      )

      return NextResponse.json({
        success: true,
        count: createdCompetitors.length,
        competitors: createdCompetitors,
        analysis: {
          featureMatrix: discoveryResult.featureMatrix,
          pricingAnalysis: discoveryResult.pricingAnalysis,
          swot: discoveryResult.swot
        }
      })
    }

    // Handle manual competitor addition
    const competitorsData = Array.isArray(body) ? body : [body]
    const validatedCompetitors = competitorsData.map(c => competitorSchema.parse(c))

    const createdCompetitors = await Promise.all(
      validatedCompetitors.map(data => 
        prisma.competitor.create({
          data: {
            validationId: params.id,
            ...data
          }
        })
      )
    )

    return NextResponse.json(createdCompetitors, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error adding competitor:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been'
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5)
}

// GET competitors for a validation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const competitors = await prisma.competitor.findMany({
      where: {
        validationId: params.id,
        validation: {
          userId: session.user.id
        }
      }
    })

    return NextResponse.json(competitors)
  } catch (error) {
    console.error("Error fetching competitors:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
