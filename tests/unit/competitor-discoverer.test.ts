import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CompetitorDiscoverer } from '@/lib/competitor-discoverer';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const axios = await import('axios');

describe('CompetitorDiscoverer', () => {
  let discoverer: CompetitorDiscoverer;

  beforeEach(() => {
    discoverer = new CompetitorDiscoverer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discover', () => {
    it('should return empty result when no API keys configured', async () => {
      delete process.env.PRODUCT_HUNT_API_KEY;
      delete process.env.GOOGLE_SEARCH_API_KEY;

      const result = await discoverer.discover('Test Idea', ['keyword']);

      expect(result.competitors).toHaveLength(0);
      expect(result.featureMatrix.features).toHaveLength(0);
      expect(result.swot).toBeDefined();
    });

    it('should handle discovery errors gracefully', async () => {
      process.env.PRODUCT_HUNT_API_KEY = 'test-key';
      (axios.default.get as any).mockRejectedValue(new Error('API Error'));

      const result = await discoverer.discover('Test Idea', ['keyword']);

      expect(result).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate high relevance for matching name', () => {
      const product = {
        name: 'Test Keyword Product',
        tagline: 'A great keyword solution',
        topics: [{ name: 'keyword' }],
      };

      const relevance = (discoverer as any).calculateRelevance('keyword', product);

      expect(relevance).toBe(1);
    });

    it('should calculate partial relevance for tagline match', () => {
      const product = {
        name: 'Different Name',
        tagline: 'Great keyword solution',
        topics: [],
      };

      const relevance = (discoverer as any).calculateRelevance('keyword', product);

      expect(relevance).toBe(0.3);
    });

    it('should return 0 for no matches', () => {
      const product = {
        name: 'Unrelated Product',
        tagline: 'No keyword here',
        topics: [{ name: 'other' }],
      };

      const relevance = (discoverer as any).calculateRelevance('keyword', product);

      expect(relevance).toBe(0);
    });
  });

  describe('dedupeCompetitors', () => {
    it('should remove duplicate competitors by URL', () => {
      const competitors = [
        { name: 'Competitor 1', url: 'https://example.com', description: '', features: [], pricing: [], strengths: [], weaknesses: [], relevanceScore: 0.8 },
        { name: 'Competitor 2', url: 'https://example2.com', description: '', features: [], pricing: [], strengths: [], weaknesses: [], relevanceScore: 0.7 },
        { name: 'Competitor 1 Duplicate', url: 'https://example.com', description: '', features: [], pricing: [], strengths: [], weaknesses: [], relevanceScore: 0.8 },
      ];

      const deduped = (discoverer as any).dedupeCompetitors(competitors);

      expect(deduped).toHaveLength(2);
      expect(deduped[0].name).toBe('Competitor 1');
    });

    it('should handle case-insensitive URLs', () => {
      const competitors = [
        { name: 'Competitor 1', url: 'https://Example.com', description: '', features: [], pricing: [], strengths: [], weaknesses: [], relevanceScore: 0.8 },
        { name: 'Competitor 1 Duplicate', url: 'https://example.com', description: '', features: [], pricing: [], strengths: [], weaknesses: [], relevanceScore: 0.8 },
      ];

      const deduped = (discoverer as any).dedupeCompetitors(competitors);

      expect(deduped).toHaveLength(1);
    });
  });

  describe('extractFeatures', () => {
    it('should extract features from website content', () => {
      const websiteData = {
        content: 'Our platform offers API integration, automation, analytics dashboard, and mobile support.',
        titles: ['Features', 'Analytics Dashboard'],
        description: '',
      };

      const features = (discoverer as any).extractFeatures(websiteData, 'Test Company');

      expect(features.length).toBeGreaterThan(0);
      expect(features.some(f => f.name.toLowerCase() === 'api')).toBe(true);
      expect(features.some(f => f.name.toLowerCase() === 'automation')).toBe(true);
    });

    it('should limit features to 20', () => {
      const websiteData = {
        content: Array(50).fill('api integration automation analytics dashboard').join(' '),
        titles: [],
        description: '',
      };

      const features = (discoverer as any).extractFeatures(websiteData, 'Test Company');

      expect(features.length).toBeLessThanOrEqual(20);
    });
  });

  describe('extractPricing', () => {
    it('should extract monthly pricing', () => {
      const websiteData = {
        content: 'Plans start at $29 per month. We also offer annual billing.',
        titles: [],
        description: '',
      };

      const pricing = (discoverer as any).extractPricing(websiteData);

      expect(pricing.length).toBeGreaterThan(0);
      expect(pricing[0].price).toBe(29);
      expect(pricing[0].billingCycle).toBe('monthly');
    });

    it('should extract free plan', () => {
      const websiteData = {
        content: 'Start for free. Free plan includes basic features.',
        titles: [],
        description: '',
      };

      const pricing = (discoverer as any).extractPricing(websiteData);

      const freePlan = pricing.find(p => p.price === 0);
      expect(freePlan).toBeDefined();
    });

    it('should return unknown pricing when no pattern matches', () => {
      const websiteData = {
        content: 'Contact us for pricing information.',
        titles: [],
        description: '',
      };

      const pricing = (discoverer as any).extractPricing(websiteData);

      expect(pricing[0].plan).toBe('Unknown');
      expect(pricing[0].price).toBeNull();
    });
  });

  describe('analyzeStrengthsWeaknesses', () => {
    it('should identify strengths from content', () => {
      const websiteData = {
        content: 'We are the leading provider with easy-to-use interface and 24/7 support.',
        titles: [],
        description: '',
      };

      const { strengths, weaknesses } = (discoverer as any).analyzeStrengthsWeaknesses(websiteData, '');

      expect(strengths.length).toBeGreaterThan(0);
      expect(strengths.some(s => s.toLowerCase().includes('market leader'))).toBe(true);
    });

    it('should identify weaknesses from content', () => {
      const websiteData = {
        content: 'Some users find it expensive and the learning curve is steep.',
        titles: [],
        description: '',
      };

      const { strengths, weaknesses } = (discoverer as any).analyzeStrengthsWeaknesses(websiteData, '');

      expect(weaknesses.length).toBeGreaterThan(0);
    });

    it('should return empty arrays when no indicators found', () => {
      const websiteData = {
        content: 'Neutral content with no sentiment indicators.',
        titles: [],
        description: '',
      };

      const { strengths, weaknesses } = (discoverer as any).analyzeStrengthsWeaknesses(websiteData, '');

      expect(strengths).toHaveLength(0);
      expect(weaknesses).toHaveLength(0);
    });
  });

  describe('buildFeatureMatrix', () => {
    it('should build feature matrix from competitors', () => {
      const competitors = [
        {
          name: 'Competitor A',
          url: 'https://a.com',
          description: '',
          features: [
            { name: 'API', description: '', status: 'available' },
            { name: 'Dashboard', description: '', status: 'available' },
          ],
          pricing: [],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.8,
        },
        {
          name: 'Competitor B',
          url: 'https://b.com',
          description: '',
          features: [
            { name: 'API', description: '', status: 'available' },
            { name: 'Reporting', description: '', status: 'available' },
          ],
          pricing: [],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.7,
        },
      ];

      const matrix = (discoverer as any).buildFeatureMatrix(competitors);

      expect(matrix.features).toContain('API');
      expect(matrix.features).toContain('Dashboard');
      expect(matrix.features).toContain('Reporting');
      expect(matrix.matrix['Competitor A']['API']).toBe(true);
      expect(matrix.matrix['Competitor A']['Reporting']).toBe(false);
    });
  });

  describe('analyzePricing', () => {
    it('should analyze pricing across competitors', () => {
      const competitors = [
        {
          name: 'A',
          url: 'https://a.com',
          description: '',
          features: [],
          pricing: [
            { plan: 'Basic', price: 29, currency: 'USD', billingCycle: 'monthly' },
            { plan: 'Pro', price: 99, currency: 'USD', billingCycle: 'monthly' },
          ],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.8,
        },
        {
          name: 'B',
          url: 'https://b.com',
          description: '',
          features: [],
          pricing: [
            { plan: 'Free', price: 0, currency: 'USD', billingCycle: 'freemium' },
            { plan: 'Premium', price: 49, currency: 'USD', billingCycle: 'monthly' },
          ],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.7,
        },
      ];

      const analysis = (discoverer as any).analyzePricing(competitors);

      expect(analysis.minPrice).toBe(29);
      expect(analysis.maxPrice).toBe(99);
      expect(analysis.avgPrice).toBe(59);
      expect(analysis.freeOptions).toBe(1);
    });

    it('should handle competitors with no pricing', () => {
      const competitors = [
        {
          name: 'A',
          url: 'https://a.com',
          description: '',
          features: [],
          pricing: [{ plan: 'Unknown', price: null, currency: 'USD', billingCycle: 'monthly' }],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.8,
        },
      ];

      const analysis = (discoverer as any).analyzePricing(competitors);

      expect(analysis.minPrice).toBeNull();
      expect(analysis.maxPrice).toBeNull();
      expect(analysis.avgPrice).toBeNull();
    });
  });

  describe('generateSWOT', () => {
    it('should generate SWOT analysis from competitors', () => {
      const competitors = [
        {
          name: 'A',
          url: 'https://a.com',
          description: '',
          features: [],
          pricing: [],
          strengths: ['Market leader', 'User-friendly'],
          weaknesses: ['Expensive'],
          relevanceScore: 0.8,
        },
        {
          name: 'B',
          url: 'https://b.com',
          description: '',
          features: [],
          pricing: [],
          strengths: ['Market leader', 'Good support'],
          weaknesses: ['Expensive', 'Complex'],
          relevanceScore: 0.7,
        },
      ];

      const swot = (discoverer as any).generateSWOT(competitors, 'Test Idea');

      expect(swot.strengths.length).toBeGreaterThan(0);
      expect(swot.weaknesses.length).toBeGreaterThan(0);
      expect(swot.opportunities.length).toBeGreaterThan(0);
      expect(swot.threats.length).toBeGreaterThan(0);
      expect(swot.strengths).toContain('Market leader');
      expect(swot.weaknesses).toContain('Expensive');
    });

    it('should return empty SWOT when no patterns found', () => {
      const competitors = [
        {
          name: 'A',
          url: 'https://a.com',
          description: '',
          features: [],
          pricing: [],
          strengths: [],
          weaknesses: [],
          relevanceScore: 0.8,
        },
      ];

      const swot = (discoverer as any).generateSWOT(competitors, 'Test Idea');

      expect(swot.strengths).toHaveLength(0);
      expect(swot.weaknesses).toHaveLength(0);
      expect(swot.opportunities.length).toBeGreaterThan(0); // Opportunities are always generated
    });
  });

  describe('createEmptySWOT', () => {
    it('should return empty SWOT structure', () => {
      const swot = (discoverer as any).createEmptySWOT();

      expect(swot).toEqual({
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      });
    });
  });
});
