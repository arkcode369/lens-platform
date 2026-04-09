import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { marketScanner } from "@/lib/market-scanner"
import { sentimentAnalyzer } from "@/lib/sentiment-analyzer"
import { validationScoreCalculator } from "@/lib/validation-score"

const prisma = new PrismaClient()

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

    const validationId = params.id

    // Verify ownership
    const validation = await prisma.validation.findFirst({
      where: {
        id: validationId,
        userId: session.user.id
      }
    })

    if (!validation) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 })
    }

    // Update status to processing
    await prisma.validation.update({
      where: { id: validationId },
      data: { status: "processing" }
    })

    // Extract keywords from idea
    const keywords = this.extractKeywords(validation.ideaDescription)
    
    // Add target audience as keyword if available
    if (validation.targetAudience) {
      keywords.push(...this.extractKeywords(validation.targetAudience))
    }

    // Remove duplicates
    const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 5)

    console.log(`Starting market scan for validation ${validationId} with keywords:`, uniqueKeywords)

    // Step 1: Market Scan
    const marketScan = await marketScanner.scan(validation.ideaDescription, uniqueKeywords)
    console.log(`Market scan completed. Total mentions: ${marketScan.totalMentions}`)

    // Step 2: Sentiment Analysis
    const allTexts = this.collectTextFromSignals(marketScan.signals)
    const sentiment = await sentimentAnalyzer.analyzeBatch(allTexts)
    console.log(`Sentiment analysis completed. Overall: ${sentiment.overall}`)

    // Step 3: Calculate Validation Score
    const competitorCount = await prisma.competitor.count({
      where: { validationId }
    })

    const score = validationScoreCalculator.calculate(
      marketScan,
      sentiment,
      competitorCount
    )
    console.log(`Validation score calculated: ${score.total}`)

    // Step 4: Update database
    const updatedValidation = await prisma.validation.update({
      where: { id: validationId },
      data: {
        validationScore: score.total,
        demandSignals: marketScan,
        sentiment: sentiment,
        painPoints: sentiment.painPoints,
        keywords: uniqueKeywords,
        status: "completed",
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      validation: updatedValidation,
      analysis: {
        marketScan,
        sentiment,
        score
      }
    })
  } catch (error) {
    console.error("Analysis error:", error)
    
    // Update status to failed
    await prisma.validation.update({
      where: { id: params.id },
      data: { status: "failed", updatedAt: new Date() }
    })

    return NextResponse.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

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

    const validation = await prisma.validation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        competitors: true,
        interviews: true,
        marketSize: true,
        mvpScope: true
      }
    })

    if (!validation) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 })
    }

    return NextResponse.json(validation)
  } catch (error) {
    console.error("Error fetching validation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper functions
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'as',
    'if', 'then', 'else', 'when', 'where', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 20)
}

function collectTextFromSignals(signals: any[]): string[] {
  const texts: string[] = []

  for (const signal of signals) {
    if (signal.data?.topPosts) {
      for (const post of signal.data.topPosts) {
        if (post.title) texts.push(post.title)
        if (post.description) texts.push(post.description)
      }
    }
    if (signal.data?.recentTweets) {
      for (const tweet of signal.data.recentTweets) {
        if (tweet.text) texts.push(tweet.text)
      }
    }
    if (signal.data?.products) {
      for (const product of signal.data.products) {
        if (product.name) texts.push(product.name)
        if (product.tagline) texts.push(product.tagline)
      }
    }
  }

  return texts
}
