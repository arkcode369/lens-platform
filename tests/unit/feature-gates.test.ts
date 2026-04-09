import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasFeatureAccess, canPerformValidation, getRateLimit, validateRequest, getUserPlan } from '@/lib/feature-gates';

// Mock Prisma client
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
  },
  validation: {
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

describe('Feature Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasFeatureAccess', () => {
    it('should deny teamWorkspace for free plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const access = await hasFeatureAccess('user1', 'teamWorkspace');

      expect(access).toBe(false);
    });

    it('should allow teamWorkspace for team plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'team' });

      const access = await hasFeatureAccess('user1', 'teamWorkspace');

      expect(access).toBe(true);
    });

    it('should allow teamWorkspace for enterprise plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'enterprise' });

      const access = await hasFeatureAccess('user1', 'teamWorkspace');

      expect(access).toBe(true);
    });

    it('should deny advancedFeatures for free plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const access = await hasFeatureAccess('user1', 'advancedFeatures');

      expect(access).toBe(false);
    });

    it('should allow advancedFeatures for individual plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'individual' });

      const access = await hasFeatureAccess('user1', 'advancedFeatures');

      expect(access).toBe(true);
    });

    it('should deny prioritySupport for individual plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'individual' });

      const access = await hasFeatureAccess('user1', 'prioritySupport');

      expect(access).toBe(false);
    });

    it('should allow prioritySupport for team plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'team' });

      const access = await hasFeatureAccess('user1', 'prioritySupport');

      expect(access).toBe(true);
    });

    it('should use free plan when no subscription found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const access = await hasFeatureAccess('user1', 'advancedFeatures');

      expect(access).toBe(false);
    });
  });

  describe('canPerformValidation', () => {
    it('should allow unlimited validations for enterprise plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'enterprise' });

      const result = await canPerformValidation('user1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(Infinity);
    });

    it('should count validations for free plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });
      mockPrisma.validation.count.mockResolvedValue(3);

      const result = await canPerformValidation('user1');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(2);
    });

    it('should deny when validation limit reached', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });
      mockPrisma.validation.count.mockResolvedValue(5);

      const result = await canPerformValidation('user1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow validations for individual plan with higher limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'individual' });
      mockPrisma.validation.count.mockResolvedValue(40);

      const result = await canPerformValidation('user1');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(10);
    });

    it('should use free plan when no subscription found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.validation.count.mockResolvedValue(0);

      const result = await canPerformValidation('user1');

      expect(result.limit).toBe(5);
    });
  });

  describe('getRateLimit', () => {
    it('should return free plan rate limits', () => {
      const limits = getRateLimit('free');

      expect(limits.requestsPerMinute).toBe(5);
      expect(limits.requestsPerHour).toBe(20);
      expect(limits.requestsPerDay).toBe(50);
    });

    it('should return individual plan rate limits', () => {
      const limits = getRateLimit('individual');

      expect(limits.requestsPerMinute).toBe(10);
      expect(limits.requestsPerHour).toBe(50);
      expect(limits.requestsPerDay).toBe(200);
    });

    it('should return team plan rate limits', () => {
      const limits = getRateLimit('team');

      expect(limits.requestsPerMinute).toBe(20);
      expect(limits.requestsPerHour).toBe(200);
      expect(limits.requestsPerDay).toBe(1000);
    });

    it('should return enterprise plan rate limits', () => {
      const limits = getRateLimit('enterprise');

      expect(limits.requestsPerMinute).toBe(100);
      expect(limits.requestsPerHour).toBe(1000);
      expect(limits.requestsPerDay).toBe(10000);
    });

    it('should return free plan limits for invalid plan', () => {
      const limits = getRateLimit('invalid' as any);

      expect(limits.requestsPerMinute).toBe(5);
      expect(limits.requestsPerHour).toBe(20);
      expect(limits.requestsPerDay).toBe(50);
    });

    it('should return free plan limits when plan is undefined', () => {
      const limits = getRateLimit();

      expect(limits.requestsPerMinute).toBe(5);
    });
  });

  describe('validateRequest', () => {
    it('should allow validation when under limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });
      mockPrisma.validation.count.mockResolvedValue(3);

      const result = await validateRequest('user1', 'validation');

      expect(result.allowed).toBe(true);
    });

    it('should deny validation when at limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });
      mockPrisma.validation.count.mockResolvedValue(5);

      const result = await validateRequest('user1', 'validation');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Validation limit');
    });

    it('should allow API calls', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'free' });

      const result = await validateRequest('user1', 'api_call');

      expect(result.allowed).toBe(true);
    });

    it('should allow validation for enterprise plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'enterprise' });

      const result = await validateRequest('user1', 'validation');

      expect(result.allowed).toBe(true);
    });
  });

  describe('getUserPlan', () => {
    it('should return user plan information', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        plan: 'team',
        status: 'active',
      });

      const plan = await getUserPlan('user1');

      expect(plan.planId).toBe('team');
      expect(plan.planName).toBe('Team');
      expect(plan.price).toBe(29900);
      expect(plan.status).toBe('active');
      expect(plan.features.advancedFeatures).toBe(true);
    });

    it('should return free plan when no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const plan = await getUserPlan('user1');

      expect(plan.planId).toBe('free');
      expect(plan.planName).toBe('Free');
      expect(plan.price).toBe(0);
      expect(plan.status).toBe('free');
    });

    it('should include correct features for each plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'individual', status: 'active' });

      const plan = await getUserPlan('user1');

      expect(plan.features.validationsPerMonth).toBe(50);
      expect(plan.features.maxTeamMembers).toBe(1);
      expect(plan.features.advancedFeatures).toBe(true);
      expect(plan.features.prioritySupport).toBe(false);
    });
  });
});
