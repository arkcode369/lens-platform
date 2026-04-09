import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { twoFactor } from "better-auth/plugins"
import { PrismaClient } from "@prisma/client"

// Initialize Prisma Client
const prisma = new PrismaClient()

// Create auth instance
const authInstance = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"]
    }
  },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: true }
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory"
  },
  advanced: {
    generateId: () => crypto.randomUUID()
  },
  plugins: [
    twoFactor({
      otpOptions: {
        digits: 6,
        period: 30,
        window: 1
      },
      secret: {
        size: 32
      }
    })
  ]
})

// Export as default and named
export default authInstance
export const auth = authInstance

export type Auth = typeof authInstance
