import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

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
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!validation) {
      return NextResponse.json({ error: "Validation not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: validation.status,
      updatedAt: validation.updatedAt
    })
  } catch (error) {
    console.error("Error checking status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
