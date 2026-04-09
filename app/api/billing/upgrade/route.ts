import { NextRequest, NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { getServerSession } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get customer and current subscription
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeCustomerId || !subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get the price ID for the new plan
    const newPriceId = plan.priceId;
    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Plan not configured for Stripe' },
        { status: 400 }
      );
    }

    // Get current subscription items
    const currentSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    );

    // Update database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: planId,
        currentPeriodStart: new Date(
          updatedSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          updatedSubscription.current_period_end * 1000
        ),
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        plan: planId,
        status: updatedSubscription.status,
      },
    });
  } catch (error: any) {
    console.error('Upgrade error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
