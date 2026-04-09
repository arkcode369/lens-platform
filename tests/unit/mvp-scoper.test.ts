import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MVPScooper } from '@/lib/mvp-scoper';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const axios = await import('axios');

describe('MVPScooper', () => {
  let scooper: MVPScooper;

  beforeEach(() => {
    scooper = new MVPScooper();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scope', () => {
    it('should scope MVP with provided features', async () => {
      const result = await scooper.scope(
        'Task Management App',
        'Small Business Owners',
        'Teams struggle to track tasks and deadlines',
        ['User authentication', 'Task creation', 'Dashboard', 'Email notifications']
      );

      expect(result.recommendedFeatures.length).toBeGreaterThan(0);
      expect(result.totalEffort).toBeDefined();
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.timeline.phases.length).toBeGreaterThan(0);
      expect(result.buildVsBuy).toBeDefined();
    });

    it('should scope MVP without provided features', async () => {
      const result = await scooper.scope(
        'New Product',
        'Consumers',
        'Users need a better solution',
        []
      );

      expect(result.recommendedFeatures.length).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });
  });

  describe('extractCoreFeatures', () => {
    it('should use provided features', () => {
      const features = (scooper as any).extractCoreFeatures(
        'Problem statement',
        ['Feature 1', 'Feature 2', 'Feature 3']
      );

      expect(features.length).toBe(3);
      expect(features[0].name).toBe('Feature 1');
    });

    it('should extract default features when none provided', () => {
      const features = (scooper as any).extractCoreFeatures('Problem statement', []);

      expect(features.length).toBeGreaterThan(0);
      expect(features[0].name).toContain('User authentication');
    });

    it('should limit features to 10', () => {
      const manyFeatures = Array(20).fill('Feature');
      const features = (scooper as any).extractCoreFeatures('Problem', manyFeatures);

      expect(features.length).toBeLessThanOrEqual(15);
    });
  });

  describe('calculateRICE', () => {
    it('should calculate RICE score correctly', () => {
      const feature = {
        id: 'f1',
        name: 'User Authentication',
        description: 'Secure user authentication system',
        priority: 1,
        effort: { personMonths: 2, personWeeks: 8, personDays: 40, complexity: 'medium', teamSize: 2, timeline: '2 months' },
        rationale: 'Core feature',
        category: 'core',
      };

      const rice = (scooper as any).calculateRICE(feature);

      expect(rice.reach).toBeGreaterThan(0);
      expect(rice.impact).toBeGreaterThanOrEqual(0.25);
      expect(rice.impact).toBeLessThanOrEqual(3);
      expect(rice.confidence).toBeGreaterThanOrEqual(0);
      expect(rice.confidence).toBeLessThanOrEqual(100);
      expect(rice.effort).toBe(2);
      expect(rice.score).toBeGreaterThan(0);
    });
  });

  describe('estimateEffort', () => {
    it('should estimate low complexity features', () => {
      const effort = (scooper as any).estimateEffort('Dashboard');

      expect(effort.complexity).toBe('low');
      expect(effort.personMonths).toBe(2);
    });

    it('should estimate high complexity features', () => {
      const effort = (scooper as any).estimateEffort('Payment Integration');

      expect(effort.complexity).toBe('high');
      expect(effort.personMonths).toBe(4);
    });

    it('should estimate very high complexity features', () => {
      const effort = (scooper as any).estimateEffort('ML-powered recommendations');

      expect(effort.complexity).toBe('very-high');
      expect(effort.personMonths).toBe(5);
    });

    it('should estimate medium complexity for unknown features', () => {
      const effort = (scooper as any).estimateEffort('Unknown feature');

      expect(effort.complexity).toBe('medium');
      expect(effort.personMonths).toBe(2);
    });
  });

  describe('analyzeBuildVsBuy', () => {
    it('should recommend buying authentication', () => {
      const features = [
        {
          id: 'f1',
          name: 'User Authentication',
          description: 'Auth system',
          priority: 1,
          effort: { personMonths: 3, personWeeks: 12, personDays: 60, complexity: 'medium', teamSize: 2, timeline: '3 months' },
          rationale: 'Needed',
          category: 'core',
        },
      ];

      const buildVsBuy = (scooper as any).analyzeBuildVsBuy(features);

      const authInBuy = buildVsBuy.buy.some(item => item.name.toLowerCase().includes('auth'));
      expect(authInBuy).toBe(true);
    });

    it('should recommend building core differentiators', () => {
      const features = [
        {
          id: 'f1',
          name: 'Proprietary Algorithm',
          description: 'Unique ML algorithm',
          priority: 1,
          effort: { personMonths: 4, personWeeks: 16, personDays: 80, complexity: 'high', teamSize: 3, timeline: '4 months' },
          rationale: 'Core differentiator',
          category: 'core',
        },
      ];

      const buildVsBuy = (scooper as any).analyzeBuildVsBuy(features);

      const algoInBuild = buildVsBuy.build.some(item => item.name.toLowerCase().includes('algorithm'));
      expect(algoInBuild).toBe(true);
    });
  });

  describe('calculateTotalEffort', () => {
    it('should calculate total effort from core features', () => {
      const features = [
        {
          id: 'f1',
          name: 'Feature 1',
          description: '',
          priority: 1,
          effort: { personMonths: 2, personWeeks: 8, personDays: 40, complexity: 'medium', teamSize: 2, timeline: '2 months' },
          rationale: '',
          category: 'core',
        },
        {
          id: 'f2',
          name: 'Feature 2',
          description: '',
          priority: 2,
          effort: { personMonths: 3, personWeeks: 12, personDays: 60, complexity: 'high', teamSize: 2, timeline: '3 months' },
          rationale: '',
          category: 'core',
        },
        {
          id: 'f3',
          name: 'Feature 3',
          description: '',
          priority: 3,
          effort: { personMonths: 1, personWeeks: 4, personDays: 20, complexity: 'low', teamSize: 1, timeline: '1 month' },
          rationale: '',
          category: 'important',
        },
      ];

      const totalEffort = (scooper as any).calculateTotalEffort(features);

      expect(totalEffort.personMonths).toBe(5); // Only core features
      expect(totalEffort.personWeeks).toBe(20);
    });
  });

  describe('identifyRisks', () => {
    it('should identify standard risks', () => {
      const risks = (scooper as any).identifyRisks('Test Idea', 'Target Audience', []);

      expect(risks.length).toBeGreaterThan(0);
      expect(risks.some(r => r.type === 'market')).toBe(true);
      expect(risks.some(r => r.type === 'technical')).toBe(true);
      expect(risks.some(r => r.type === 'competitive')).toBe(true);
    });

    it('should add feature-specific risks for high complexity', () => {
      const features = [
        {
          id: 'f1',
          name: 'Complex Feature',
          description: '',
          priority: 1,
          effort: { personMonths: 6, personWeeks: 24, personDays: 120, complexity: 'very-high', teamSize: 4, timeline: '6 months' },
          rationale: '',
          category: 'core',
        },
      ];

      const risks = (scooper as any).identifyRisks('Test', 'Audience', features);

      const complexityRisk = risks.find(r => r.description.includes('High complexity'));
      expect(complexityRisk).toBeDefined();
    });

    it('should limit risks to 10', () => {
      const manyFeatures = Array(20).fill({
        id: 'f1',
        name: 'Very High Complexity Feature',
        description: '',
        priority: 1,
        effort: { personMonths: 6, personWeeks: 24, personDays: 120, complexity: 'very-high', teamSize: 4, timeline: '6 months' },
        rationale: '',
        category: 'core',
      });

      const risks = (scooper as any).identifyRisks('Test', 'Audience', manyFeatures);

      expect(risks.length).toBeLessThanOrEqual(10);
    });
  });

  describe('createPhases', () => {
    it('should create three delivery phases', () => {
      const features = [
        {
          id: 'f1',
          name: 'Core Feature 1',
          description: '',
          priority: 1,
          effort: { personMonths: 2, personWeeks: 8, personDays: 40, complexity: 'medium', teamSize: 2, timeline: '2 months' },
          rationale: '',
          category: 'core',
        },
        {
          id: 'f2',
          name: 'Core Feature 2',
          description: '',
          priority: 2,
          effort: { personMonths: 2, personWeeks: 8, personDays: 40, complexity: 'medium', teamSize: 2, timeline: '2 months' },
          rationale: '',
          category: 'core',
        },
        {
          id: 'f3',
          name: 'Important Feature',
          description: '',
          priority: 3,
          effort: { personMonths: 1, personWeeks: 4, personDays: 20, complexity: 'low', teamSize: 1, timeline: '1 month' },
          rationale: '',
          category: 'important',
        },
      ];

      const totalEffort = { personMonths: 4, personWeeks: 16, personDays: 80, complexity: 'medium', teamSize: 2, timeline: '4 months' };

      const phases = (scooper as any).createPhases(features, totalEffort);

      expect(phases.length).toBe(3);
      expect(phases[0].name).toContain('Foundation');
      expect(phases[1].name).toContain('Core Features');
      expect(phases[2].name).toContain('Polish');
    });
  });

  describe('normalizeMVPScope', () => {
    it('should normalize LLM response', () => {
      const llmResponse = {
        recommendedFeatures: [
          { id: 'f1', name: 'Feature 1', description: 'Desc', priority: 1, category: 'core' },
        ],
        buildVsBuy: { build: [], buy: [] },
        totalEffort: { personMonths: 6, complexity: 'medium', teamSize: 3, timeline: '6 months' },
        risks: [{ type: 'technical', description: 'Risk', probability: 'medium', impact: 'high', mitigation: 'Mitigation' }],
        timeline: { phases: [], totalMonths: 6 },
      };

      const normalized = (scooper as any).normalizeMVPScope(llmResponse);

      expect(normalized.recommendedFeatures.length).toBe(1);
      expect(normalized.totalEffort.personMonths).toBe(6);
      expect(normalized.risks.length).toBe(1);
    });

    it('should handle missing fields with defaults', () => {
      const llmResponse = {};

      const normalized = (scooper as any).normalizeMVPScope(llmResponse);

      expect(normalized.recommendedFeatures).toHaveLength(0);
      expect(normalized.totalEffort.personMonths).toBe(6);
      expect(normalized.timeline.totalMonths).toBe(6);
    });
  });
});
