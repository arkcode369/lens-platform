import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"

const prisma = new PrismaClient()

const createValidationSchema = z.object({
  ideaDescription: z.string().min(10).max(5000),
  targetAudience: z.string().optional(),
  industry: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const validations = await prisma.validation.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json(validations)
  } catch (error) {
    console.error("Error fetching validations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createValidationSchema.parse(body)

    const validation = await prisma.validation.create({
      data: {
        userId: session.user.id,
        ...validatedData,
        status: "pending"
      }
    })

    return NextResponse.json(validation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error creating validation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
