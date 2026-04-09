import { SUBSCRIPTION_PLANS, PlanId } from './stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if a user has access to a specific feature based on their plan
 */
export async function hasFeatureAccess(
  userId: string,
  feature: 'advancedFeatures' | 'prioritySupport' | 'teamWorkspace'
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const planId = subscription?.plan || 'free';
  const plan = SUBSCRIPTION_PLANS[planId as PlanId] || SUBSCRIPTION_PLANS.FREE;

  if (feature === 'teamWorkspace') {
    // Team workspace requires Team or Enterprise plan
    return planId === 'team' || planId === 'enterprise';
  }

  return plan.features[feature] || false;
}

/**
 * Check if user can perform a validation based on their plan limits
 */
export async function canPerformValidation(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const planId = subscription?.plan || 'free';
  const plan = SUBSCRIPTION_PLANS[planId as PlanId] || SUBSCRIPTION_PLANS.FREE;
  const limit = plan.features.validationsPerMonth;

  // Unlimited access
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit };
  }

  // Count validations this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const validationCount = await prisma.validation.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  const remaining = limit - validationCount;
  const allowed = remaining > 0;

  return { allowed, remaining, limit };
}

/**
 * Get rate limit based on plan
 */
export function getRateLimit(planId: string = 'free'): {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
} {
  const plan = SUBSCRIPTION_PLANS[planId as PlanId] || SUBSCRIPTION_PLANS.FREE;

  switch (planId) {
    case 'free':
      return {
        requestsPerMinute: 5,
        requestsPerHour: 20,
        requestsPerDay: 50,
      };
    case 'individual':
      return {
        requestsPerMinute: 10,
        requestsPerHour: 50,
        requestsPerDay: 200,
      };
    case 'team':
      return {
        requestsPerMinute: 20,
        requestsPerHour: 200,
        requestsPerDay: 1000,
      };
    case 'enterprise':
      return {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      };
    default:
      return {
        requestsPerMinute: 5,
        requestsPerHour: 20,
        requestsPerDay: 50,
      };
  }
}

/**
 * Validate request based on plan limits
 */
export async function validateRequest(
  userId: string,
  action: 'validation' | 'api_call'
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const planId = subscription?.plan || 'free';

  if (action === 'validation') {
    const { allowed, remaining } = await canPerformValidation(userId);
    if (!allowed) {
      return {
        allowed: false,
        reason: `Validation limit reached for this month. Limit: ${remaining === Infinity ? 'Unlimited' : '0'}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Get plan information for a user
 */
export async function getUserPlan(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const planId = subscription?.plan || 'free';
  const plan = SUBSCRIPTION_PLANS[planId as PlanId] || SUBSCRIPTION_PLANS.FREE;

  return {
    planId,
    planName: plan.name,
    price: plan.price,
    features: plan.features,
    status: subscription?.status || 'free',
  };
}
