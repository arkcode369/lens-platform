import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!subscription) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { userId: session.user.id },
      })

      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          stripeCustomerId: customer.id,
          plan: 'individual',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })
    }

    // Get usage statistics
    const validationsCount = await prisma.validation.count({
      where: { userId: session.user.id },
    })

    const usage = subscription.usage || { validationsUsed: 0, validationsLimit: 10 }

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        usage: {
          validationsUsed: validationsCount,
          validationsLimit: usage.validationsLimit || 10,
          interviewsUsed: usage.interviewsUsed || 0,
          interviewsLimit: usage.interviewsLimit || 50,
        },
        canUpgrade: true,
      },
    })
  } catch (error) {
    console.error('Billing info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body

    if (!['individual', 'team', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get or create subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Update subscription plan
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: plan === 'individual' 
          ? { validationsUsed: 0, validationsLimit: 10, interviewsUsed: 0, interviewsLimit: 50 }
          : plan === 'team'
          ? { validationsUsed: 0, validationsLimit: 50, interviewsUsed: 0, interviewsLimit: 200 }
          : { validationsUsed: 0, validationsLimit: 500, interviewsUsed: 0, interviewsLimit: 1000 },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        plan: subscription.plan,
        status: subscription.status,
      },
    })
  } catch (error) {
    console.error('Upgrade subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
