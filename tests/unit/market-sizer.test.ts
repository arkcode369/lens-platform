import { describe, it, expect, beforeEach } from 'vitest';
import { MarketSizer } from '@/lib/market-sizer';

describe('MarketSizer', () => {
  let sizer: MarketSizer;

  beforeEach(() => {
    sizer = new MarketSizer();
  });

  describe('calculate', () => {
    it('should calculate market size for known industry', async () => {
      const result = await sizer.calculate('AI', 'Small Business', 'United States');

      expect(result).toBeDefined();
      expect(result.tam).toBeDefined();
      expect(result.sam).toBeDefined();
      expect(result.som).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('should return default market size for unknown industry', async () => {
      const result = await sizer.calculate('Unknown Niche', 'Everyone', 'Global');

      expect(result.tam).toBe(10000000000);
      expect(result.sam).toBe(2000000000);
      expect(result.som).toBe(100000000);
    });

    it('should estimate growth rate for AI industry', async () => {
      const result = await sizer.calculate('Artificial Intelligence', 'Enterprise', 'Global');

      expect(result.growthRate).toBe(37);
    });

    it('should estimate growth rate for SaaS industry', async () => {
      const result = await sizer.calculate('SaaS Product', 'Small Business', 'Global');

      expect(result.growthRate).toBe(18);
    });
  });

  describe('calculateTAM', () => {
    it('should use industry data when available', () => {
      const industryData = { marketSize: 196000000000, year: 2024 };
      const demographicData = { targetPopulation: 1000000 };

      const tam = (sizer as any).calculateTAM(industryData, demographicData);

      expect(tam).toBe(196000000000);
    });

    it('should calculate from demographic data', () => {
      const industryData = null;
      const demographicData = { targetPopulation: 1000000, penetrationRate: 0.1, avgAnnualSpend: 100 };

      const tam = (sizer as any).calculateTAM(industryData, demographicData);

      expect(tam).toBe(10000000000); // 1M * 0.1 * 100
    });

    it('should return null when no data available', () => {
      const tam = (sizer as any).calculateTAM(null, null);

      expect(tam).toBeNull();
    });
  });

  describe('calculateSAM', () => {
    it('should apply geographic multiplier for US', () => {
      const tam = 1000000000;
      const sam = (sizer as any).calculateSAM(tam, 'United States', 'Small Business');

      expect(sam).toBe(200000000); // 1B * 0.4 * 0.5
    });

    it('should apply geographic multiplier for Europe', () => {
      const tam = 1000000000;
      const sam = (sizer as any).calculateSAM(tam, 'Europe', 'Consumer');

      expect(sam).toBe(300000000); // 1B * 0.3 * 1.0
    });

    it('should return null if TAM is null', () => {
      const sam = (sizer as any).calculateSAM(null, 'Global', 'Enterprise');

      expect(sam).toBeNull();
    });
  });

  describe('calculateSOM', () => {
    it('should calculate SOM based on competitor count', () => {
      const sam = 100000000;

      const som50Competitors = (sizer as any).calculateSOM(sam, { count: 50 });
      const som5Competitors = (sizer as any).calculateSOM(sam, { count: 5 });

      expect(som50Competitors).toBeLessThan(som5Competitors);
    });

    it('should return null if SAM is null', () => {
      const som = (sizer as any).calculateSOM(null, { count: 10 });

      expect(som).toBeNull();
    });
  });

  describe('estimateGrowthRate', () => {
    it('should return 37% for AI', () => {
      const rate = (sizer as any).estimateGrowthRate('AI');
      expect(rate).toBe(37);
    });

    it('should return 18% for SaaS', () => {
      const rate = (sizer as any).estimateGrowthRate('SaaS');
      expect(rate).toBe(18);
    });

    it('should return 23% for E-commerce', () => {
      const rate = (sizer as any).estimateGrowthRate('E-commerce');
      expect(rate).toBe(23);
    });

    it('should return default 10% for unknown industry', () => {
      const rate = (sizer as any).estimateGrowthRate('Unknown Industry');
      expect(rate).toBe(10);
    });
  });

  describe('calculateConfidence', () => {
    it('should increase confidence with better data', () => {
      const industryData = { marketSize: 1000000000, sources: [{ name: 'Source' }], year: 2024 };
      const demographicData = { targetPopulation: 1000000, sources: [{ name: 'Source' }] };
      const competitorData = { count: 50 };

      const confidence = (sizer as any).calculateConfidence(industryData, demographicData, competitorData);

      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should have base confidence of 0.3', () => {
      const confidence = (sizer as any).calculateConfidence(null, null, null);

      expect(confidence).toBe(0.3);
    });
  });

  describe('formatNumber', () => {
    it('should format billions', () => {
      expect((sizer as any).formatNumber(1000000000)).toBe('1.0B');
      expect((sizer as any).formatNumber(1500000000)).toBe('1.5B');
    });

    it('should format millions', () => {
      expect((sizer as any).formatNumber(1000000)).toBe('1.0M');
      expect((sizer as any).formatNumber(2500000)).toBe('2.5M');
    });

    it('should format thousands', () => {
      expect((sizer as any).formatNumber(1000)).toBe('1.0K');
      expect((sizer as any).formatNumber(75000)).toBe('75.0K');
    });

    it('should return string for small numbers', () => {
      expect((sizer as any).formatNumber(100)).toBe('100');
      expect((sizer as any).formatNumber(0)).toBe('0');
    });
  });

  describe('getSegmentMultiplier', () => {
    it('should return correct multiplier for enterprise', () => {
      expect((sizer as any).getSegmentMultiplier('enterprise')).toBe(0.2);
    });

    it('should return correct multiplier for consumer', () => {
      expect((sizer as any).getSegmentMultiplier('consumer')).toBe(0.8);
    });

    it('should return default 0.5 for unknown segment', () => {
      expect((sizer as any).getSegmentMultiplier('unknown')).toBe(0.5);
    });
  });

  describe('createDefaultMarketSize', () => {
    it('should create default market size structure', () => {
      const result = (sizer as any).createDefaultMarketSize('Test Industry');

      expect(result.tam).toBe(10000000000);
      expect(result.sam).toBe(2000000000);
      expect(result.som).toBe(100000000);
      expect(result.growthRate).toBe(10);
      expect(result.confidence).toBe(0.5);
      expect(result.sources.length).toBe(1);
      expect(result.calculations.tamBasis).toBeDefined();
    });
  });

  describe('generateAssumptions', () => {
    it('should generate assumptions list', () => {
      const assumptions = (sizer as any).generateAssumptions('AI', 'Enterprise', 'United States');

      expect(assumptions.length).toBeGreaterThan(0);
      expect(assumptions.some(a => a.includes('growth'))).toBe(true);
      expect(assumptions.some(a => a.includes('United States'))).toBe(true);
    });
  });
});
