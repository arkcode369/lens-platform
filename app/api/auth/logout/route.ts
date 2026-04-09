import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, deleteSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ success: true, data: { loggedOut: false } })
    }

    // Delete session from database
    await deleteSession(session.sessionToken)

    const response = NextResponse.json({
      success: true,
      data: { loggedOut: true },
    })

    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
