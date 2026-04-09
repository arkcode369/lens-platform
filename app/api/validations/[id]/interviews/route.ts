import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"

const prisma = new PrismaClient()

const interviewSchema = z.object({
  persona: z.string().min(1),
  script: z.array(z.object({
    question: z.string(),
    followUp: z.string().optional()
  })).optional(),
  targetCount: z.number().int().positive().default(10)
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
    const validatedData = interviewSchema.parse(body)

    const interview = await prisma.interview.create({
      data: {
        validationId: params.id,
        ...validatedData,
        status: "pending"
      }
    })

    return NextResponse.json(interview, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error creating interview:", error)
    return NextResponse.json(
      { error: "Internal server error" },
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

    const interviews = await prisma.interview.findMany({
      where: {
        validationId: params.id,
        validation: {
          userId: session.user.id
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(interviews)
  } catch (error) {
    console.error("Error fetching interviews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
