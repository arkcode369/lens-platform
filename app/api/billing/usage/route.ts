import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { getServerSession } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // Get plan limits
    const planId = subscription?.plan || 'free';
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.FREE;

    // Count validations this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const validationCount = await prisma.validation.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate usage percentage
    const validationsLimit = plan.features.validationsPerMonth;
    const usagePercentage = validationsLimit === Infinity 
      ? 0 
      : Math.min((validationCount / validationsLimit) * 100, 100);

    return NextResponse.json({
      plan: {
        id: planId,
        name: plan.name,
        price: plan.price,
      },
      limits: {
        validationsPerMonth: validationsLimit,
        maxTeamMembers: plan.features.maxTeamMembers,
        advancedFeatures: plan.features.advancedFeatures,
        prioritySupport: plan.features.prioritySupport,
      },
      usage: {
        validationsThisMonth: validationCount,
        validationsLimit: validationsLimit,
        usagePercentage,
        remainingValidations: validationsLimit === Infinity 
          ? Infinity 
          : validationsLimit - validationCount,
      },
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
    });
  } catch (error) {
    console.error('Usage error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    );
  }
}
