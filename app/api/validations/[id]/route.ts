import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

// GET /api/validations/[id]
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
        mvpScope: true,
        landingPages: true
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

// DELETE /api/validations/[id]
export async function DELETE(
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

    await prisma.validation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting validation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
