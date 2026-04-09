import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Subscription plan prices (in cents)
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      validationsPerMonth: 5,
      maxTeamMembers: 1,
      advancedFeatures: false,
      prioritySupport: false,
    },
  },
  INDIVIDUAL: {
    id: 'individual',
    name: 'Individual',
    price: 4900, // $49/month
    priceId: process.env.STRIPE_PRICE_ID_INDIVIDUAL,
    features: {
      validationsPerMonth: 50,
      maxTeamMembers: 1,
      advancedFeatures: true,
      prioritySupport: false,
    },
  },
  TEAM: {
    id: 'team',
    name: 'Team',
    price: 29900, // $299/month
    priceId: process.env.STRIPE_PRICE_ID_TEAM,
    features: {
      validationsPerMonth: 200,
      maxTeamMembers: 10,
      advancedFeatures: true,
      prioritySupport: true,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99900, // $999/month
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    features: {
      validationsPerMonth: Infinity,
      maxTeamMembers: Infinity,
      advancedFeatures: true,
      prioritySupport: true,
    },
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function getPlanById(planId: string) {
  const plan = Object.values(SUBSCRIPTION_PLANS).find(
    (p) => p.id === planId
  );
  return plan || SUBSCRIPTION_PLANS.FREE;
}

export function getPriceIdForPlan(planId: string): string | null {
  const plan = SUBSCRIPTION_PLANS[planId as PlanId];
  return plan?.priceId || null;
}

// Webhook event types we handle
export const WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
} as const;
