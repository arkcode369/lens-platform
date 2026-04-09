import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cancelAtPeriodEnd } = await req.json();

    // Get customer and subscription
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

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(
            updatedSubscription.current_period_end * 1000
          ),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancelAtPeriodEnd: true,
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription canceled immediately',
        cancelAtPeriodEnd: false,
      });
    }
  } catch (error: any) {
    console.error('Cancel error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
