import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe, WEBHOOK_EVENTS } from '@/lib/stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED: {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED: {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED: {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.log('No subscription ID in session');
    return;
  }

  // Fetch the full subscription object
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Get user from Stripe metadata
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  // Map Stripe plan to our plan ID
  const priceId = subscription.items.data[0]?.price.id;
  const planId = await getPriceIdFromStripe(priceId);

  // Create or update subscription
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: planId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      quantity: subscription.quantity || 1,
      startedAt: new Date(subscription.created * 1000),
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: planId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      quantity: subscription.quantity || 1,
    },
  });

  console.log(`Subscription created/updated for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find subscription by customer ID
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) {
    console.log(`No subscription found for customer ${customerId}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planId = await getPriceIdFromStripe(priceId);

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      plan: planId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      quantity: subscription.quantity || 1,
      metadata: subscription.metadata as any,
    },
  });

  console.log(`Subscription updated for user ${dbSubscription.userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find subscription by customer ID
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) {
    console.log(`No subscription found for customer ${customerId}`);
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  console.log(`Subscription canceled for user ${dbSubscription.userId}`);
}

async function getPriceIdFromStripe(priceId: string): Promise<string> {
  // This should match your Stripe price IDs to plan IDs
  // You'll need to update these with your actual Stripe price IDs
  const priceToPlanMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_INDIVIDUAL!]: 'individual',
    [process.env.STRIPE_PRICE_ID_TEAM!]: 'team',
    [process.env.STRIPE_PRICE_ID_ENTERPRISE!]: 'enterprise',
  };

  return priceToPlanMap[priceId] || 'free';
}
