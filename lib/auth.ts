import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<{
  sessionToken: string
  userId: string
  expires: Date
}> {
  const sessionToken = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DURATION)

  const session = await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expires,
    },
  })

  return {
    sessionToken: session.sessionToken,
    userId: session.userId,
    expires: session.expires,
  }
}

/**
 * Get the current user's session from request cookies
 */
export async function getServerSession(
  cookies: { get: (name: string) => { value: string } | null }
): Promise<{ sessionToken: string; userId: string } | null> {
  const sessionCookie = cookies.get('session')
  
  if (!sessionCookie?.value) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: sessionCookie.value },
  })

  if (!session || session.expires < new Date()) {
    // Session not found or expired
    return null
  }

  return {
    sessionToken: session.sessionToken,
    userId: session.userId,
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({
    where: { sessionToken },
  })
}

/**
 * Get user by session
 */
export async function getUserFromSession(
  cookies: { get: (name: string) => { value: string } | null }
): Promise<{ id: string; email: string; emailVerified: Date | null } | null> {
  const session = await getServerSession(cookies)
  
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
  }
}

/**
 * Rotate session (create new session, delete old one)
 */
export async function rotateSession(
  oldSessionToken: string,
  userId: string
): Promise<{ sessionToken: string; userId: string; expires: Date }> {
  // Delete old session
  await prisma.session.delete({
    where: { sessionToken: oldSessionToken },
  })

  // Create new session
  return createSession(userId)
}
