import { describe, it, expect, beforeEach } from 'vitest';
import { SUBSCRIPTION_PLANS, getPlanById, getPriceIdForPlan, PlanId } from '@/lib/stripe';

describe('Stripe Plans', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    it('should have FREE plan', () => {
      expect(SUBSCRIPTION_PLANS.FREE).toBeDefined();
      expect(SUBSCRIPTION_PLANS.FREE.id).toBe('free');
      expect(SUBSCRIPTION_PLANS.FREE.price).toBe(0);
      expect(SUBSCRIPTION_PLANS.FREE.features.validationsPerMonth).toBe(5);
    });

    it('should have INDIVIDUAL plan', () => {
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL).toBeDefined();
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.id).toBe('individual');
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.price).toBe(4900);
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.features.validationsPerMonth).toBe(50);
    });

    it('should have TEAM plan', () => {
      expect(SUBSCRIPTION_PLANS.TEAM).toBeDefined();
      expect(SUBSCRIPTION_PLANS.TEAM.id).toBe('team');
      expect(SUBSCRIPTION_PLANS.TEAM.price).toBe(29900);
      expect(SUBSCRIPTION_PLANS.TEAM.features.maxTeamMembers).toBe(10);
    });

    it('should have ENTERPRISE plan', () => {
      expect(SUBSCRIPTION_PLANS.ENTERPRISE).toBeDefined();
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.id).toBe('enterprise');
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.price).toBe(99900);
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.validationsPerMonth).toBe(Infinity);
    });
  });

  describe('getPlanById', () => {
    it('should return correct plan by id', () => {
      const plan = getPlanById('team');

      expect(plan.id).toBe('team');
      expect(plan.price).toBe(29900);
    });

    it('should return FREE plan for invalid id', () => {
      const plan = getPlanById('invalid-plan');

      expect(plan.id).toBe('free');
      expect(plan.price).toBe(0);
    });

    it('should return FREE plan for undefined id', () => {
      const plan = getPlanById(undefined as any);

      expect(plan.id).toBe('free');
    });
  });

  describe('getPriceIdForPlan', () => {
    it('should return price id for individual plan', () => {
      const priceId = getPriceIdForPlan('individual');

      expect(priceId).toBe(process.env.STRIPE_PRICE_ID_INDIVIDUAL || null);
    });

    it('should return null for free plan', () => {
      const priceId = getPriceIdForPlan('free');

      expect(priceId).toBeNull();
    });

    it('should return null for invalid plan', () => {
      const priceId = getPriceIdForPlan('invalid' as PlanId);

      expect(priceId).toBeNull();
    });
  });

  describe('Plan features comparison', () => {
    it('should have increasing validations per month', () => {
      expect(SUBSCRIPTION_PLANS.FREE.features.validationsPerMonth).toBeLessThan(
        SUBSCRIPTION_PLANS.INDIVIDUAL.features.validationsPerMonth
      );
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.features.validationsPerMonth).toBeLessThan(
        SUBSCRIPTION_PLANS.TEAM.features.validationsPerMonth
      );
      expect(SUBSCRIPTION_PLANS.TEAM.features.validationsPerMonth).toBeLessThan(
        SUBSCRIPTION_PLANS.ENTERPRISE.features.validationsPerMonth
      );
    });

    it('should have increasing team member limits', () => {
      expect(SUBSCRIPTION_PLANS.FREE.features.maxTeamMembers).toBeLessThan(
        SUBSCRIPTION_PLANS.TEAM.features.maxTeamMembers
      );
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.maxTeamMembers).toBe(Infinity);
    });

    it('should unlock advanced features in paid plans', () => {
      expect(SUBSCRIPTION_PLANS.FREE.features.advancedFeatures).toBe(false);
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.features.advancedFeatures).toBe(true);
      expect(SUBSCRIPTION_PLANS.TEAM.features.advancedFeatures).toBe(true);
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.advancedFeatures).toBe(true);
    });

    it('should unlock priority support in higher tiers', () => {
      expect(SUBSCRIPTION_PLANS.FREE.features.prioritySupport).toBe(false);
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.features.prioritySupport).toBe(false);
      expect(SUBSCRIPTION_PLANS.TEAM.features.prioritySupport).toBe(true);
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.features.prioritySupport).toBe(true);
    });
  });

  describe('Plan pricing', () => {
    it('should convert cents to dollars correctly', () => {
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.price / 100).toBe(49);
      expect(SUBSCRIPTION_PLANS.TEAM.price / 100).toBe(299);
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.price / 100).toBe(999);
    });

    it('should have correct price structure', () => {
      expect(SUBSCRIPTION_PLANS.FREE.price).toBe(0);
      expect(SUBSCRIPTION_PLANS.INDIVIDUAL.price).toBeGreaterThan(0);
      expect(SUBSCRIPTION_PLANS.TEAM.price).toBeGreaterThan(SUBSCRIPTION_PLANS.INDIVIDUAL.price);
      expect(SUBSCRIPTION_PLANS.ENTERPRISE.price).toBeGreaterThan(SUBSCRIPTION_PLANS.TEAM.price);
    });
  });
});
