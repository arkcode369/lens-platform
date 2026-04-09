import { NextRequest, NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_PLANS, getPriceIdForPlan } from '@/lib/stripe';
import auth from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, successUrl, cancelUrl } = await req.json();

    if (!planId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPriceIdForPlan(planId);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan not configured for Stripe' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    let customer = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    let customerId = customer?.stripeCustomerId;

    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = newCustomer.id;

      // Create subscription record
      await prisma.subscription.create({
        data: {
          userId: session.user.id,
          stripeCustomerId: customerId,
          plan: 'free',
          status: 'incomplete',
        },
      });
    } else {
      // Update customer metadata if needed
      await stripe.customers.update(customerId, {
        metadata: {
          userId: session.user.id,
        },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: session.user.id,
        planId: planId,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
