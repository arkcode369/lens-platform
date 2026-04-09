import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationScoreCalculator, ValidationScoreBreakdown } from '@/lib/validation-score';
import { MarketScanResult, DemandSignal } from '@/lib/market-scanner';
import { SentimentAnalysis } from '@/lib/sentiment-analyzer';

describe('ValidationScoreCalculator', () => {
  let calculator: ValidationScoreCalculator;

  beforeEach(() => {
    calculator = new ValidationScoreCalculator();
  });

  describe('calculate', () => {
    it('should calculate a complete validation score', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test', 'keyword'],
        signals: [
          {
            source: 'google-trends',
            mentions: 5000,
            trend: 'increasing',
            relevance: 0.8,
            data: {},
            timestamp: new Date(),
          },
          {
            source: 'reddit',
            mentions: 200,
            trend: 'stable',
            relevance: 0.6,
            data: {},
            timestamp: new Date(),
          },
        ],
        totalMentions: 5200,
        overallTrend: 'warm',
        scannedAt: new Date(),
      };

      const sentiment: SentimentAnalysis = {
        overall: 'positive',
        scores: { positive: 70, negative: 15, neutral: 15 },
        painPoints: ['pain1', 'pain2', 'pain3', 'pain4', 'pain5'],
        desires: ['desire1', 'desire2'],
        keyPhrases: ['phrase1', 'phrase2'],
        confidence: 0.85,
      };

      const competitorCount = 15;

      const result = calculator.calculate(marketScan, sentiment, competitorCount);

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);
      expect(result.breakdown).toBeDefined();
    });

    it('should assign correct letter grade', () => {
      const mockMarketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 15000,
        overallTrend: 'hot',
        scannedAt: new Date(),
      };

      const mockSentiment: SentimentAnalysis = {
        overall: 'positive',
        scores: { positive: 90, negative: 5, neutral: 5 },
        painPoints: Array(6).fill('pain'),
        desires: ['desire'],
        keyPhrases: ['phrase'],
        confidence: 0.9,
      };

      const result = calculator.calculate(mockMarketScan, mockSentiment, 20);

      expect(result.grade).toBe('A');
      expect(result.total).toBeGreaterThanOrEqual(85);
    });

    it('should handle weak validation signals', () => {
      const mockMarketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const mockSentiment: SentimentAnalysis = {
        overall: 'negative',
        scores: { positive: 10, negative: 70, neutral: 20 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.3,
      };

      const result = calculator.calculate(mockMarketScan, mockSentiment, 0);

      expect(result.grade).toBe('F');
      expect(result.total).toBeLessThan(40);
    });
  });

  describe('calculateSearchVolumeScore', () => {
    it('should give max score for very high search volume', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [
          {
            source: 'google-trends',
            mentions: 15000,
            trend: 'increasing',
            relevance: 0.8,
            data: {},
            timestamp: new Date(),
          },
        ],
        totalMentions: 15000,
        overallTrend: 'hot',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateSearchVolumeScore(marketScan);

      expect(score.score).toBe(20);
      expect(score.maxScore).toBe(20);
    });

    it('should give zero score for no search volume', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateSearchVolumeScore(marketScan);

      expect(score.score).toBe(0);
      expect(score.details).toContain('No search volume');
    });

    it('should adjust score based on trend', () => {
      const marketScanHot: MarketScanResult = {
        keywords: ['test'],
        signals: [
          {
            source: 'google-trends',
            mentions: 2000,
            trend: 'increasing',
            relevance: 0.8,
            data: {},
            timestamp: new Date(),
          },
        ],
        totalMentions: 2000,
        overallTrend: 'hot',
        scannedAt: new Date(),
      };

      const marketScanCold: MarketScanResult = {
        ...marketScanHot,
        overallTrend: 'cold',
      };

      const hotScore = (calculator as any).calculateSearchVolumeScore(marketScanHot);
      const coldScore = (calculator as any).calculateSearchVolumeScore(marketScanCold);

      expect(hotScore.score).toBeGreaterThan(coldScore.score);
    });
  });

  describe('calculateSocialMentionsScore', () => {
    it('should give max score for extensive social presence', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [
          { source: 'reddit', mentions: 300, trend: 'stable', relevance: 0.5, data: {}, timestamp: new Date() },
          { source: 'twitter', mentions: 400, trend: 'increasing', relevance: 0.5, data: {}, timestamp: new Date() },
          { source: 'producthunt', mentions: 200, trend: 'stable', relevance: 0.5, data: {}, timestamp: new Date() },
          { source: 'google-trends', mentions: 200, trend: 'stable', relevance: 0.5, data: {}, timestamp: new Date() },
        ],
        totalMentions: 1100,
        overallTrend: 'warm',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateSocialMentionsScore(marketScan);

      expect(score.score).toBe(30);
      expect(score.details).toContain('multiple platforms');
    });

    it('should give zero score for minimal presence', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 5,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateSocialMentionsScore(marketScan);

      expect(score.score).toBe(0);
    });
  });

  describe('calculateSentimentScore', () => {
    it('should give high score for positive sentiment with pain points', () => {
      const sentiment: SentimentAnalysis = {
        overall: 'positive',
        scores: { positive: 80, negative: 10, neutral: 10 },
        painPoints: ['pain1', 'pain2', 'pain3', 'pain4', 'pain5', 'pain6'],
        desires: ['desire1'],
        keyPhrases: ['phrase1'],
        confidence: 0.9,
      };

      const score = (calculator as any).calculateSentimentScore(sentiment);

      expect(score.score).toBeGreaterThanOrEqual(25);
      expect(score.score).toBeLessThanOrEqual(30);
    });

    it('should penalize negative sentiment', () => {
      const sentiment: SentimentAnalysis = {
        overall: 'negative',
        scores: { positive: 10, negative: 70, neutral: 20 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.5,
      };

      const score = (calculator as any).calculateSentimentScore(sentiment);

      expect(score.score).toBeLessThan(15);
    });

    it('should bonus for high confidence', () => {
      const sentiment: SentimentAnalysis = {
        overall: 'neutral',
        scores: { positive: 50, negative: 25, neutral: 25 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.85,
      };

      const score = (calculator as any).calculateSentimentScore(sentiment);

      expect(score.details).toContain('high confidence');
    });
  });

  describe('calculateCompetitorScore', () => {
    it('should give high score for established market', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [
          {
            source: 'producthunt',
            mentions: 10,
            trend: 'stable',
            relevance: 0.5,
            data: { products: [{ name: 'Product 1' }] },
            timestamp: new Date(),
          },
        ],
        totalMentions: 10,
        overallTrend: 'warm',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateCompetitorScore(15, marketScan);

      expect(score.score).toBe(20);
      expect(score.details).toContain('proven product success');
    });

    it('should give low score for no competitors', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateCompetitorScore(0, marketScan);

      expect(score.score).toBe(0);
      expect(score.details).toContain('No direct competitors');
    });

    it('should reward healthy competition', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const score = (calculator as any).calculateCompetitorScore(8, marketScan);

      expect(score.score).toBeGreaterThanOrEqual(12);
    });
  });

  describe('calculateGrade', () => {
    it('should return A for scores >= 85', () => {
      expect((calculator as any).calculateGrade(100)).toBe('A');
      expect((calculator as any).calculateGrade(85)).toBe('A');
    });

    it('should return B for scores 70-84', () => {
      expect((calculator as any).calculateGrade(84)).toBe('B');
      expect((calculator as any).calculateGrade(70)).toBe('B');
    });

    it('should return C for scores 55-69', () => {
      expect((calculator as any).calculateGrade(69)).toBe('C');
      expect((calculator as any).calculateGrade(55)).toBe('C');
    });

    it('should return D for scores 40-54', () => {
      expect((calculator as any).calculateGrade(54)).toBe('D');
      expect((calculator as any).calculateGrade(40)).toBe('D');
    });

    it('should return F for scores < 40', () => {
      expect((calculator as any).calculateGrade(39)).toBe('F');
      expect((calculator as any).calculateGrade(0)).toBe('F');
    });
  });

  describe('generateRecommendation', () => {
    it('should recommend proceeding for excellent validation', () => {
      const breakdown: ValidationScoreBreakdown = {
        searchVolume: { score: 20, maxScore: 20, details: '' },
        socialMentions: { score: 30, maxScore: 30, details: '' },
        sentiment: { score: 30, maxScore: 30, details: '' },
        competitorActivity: { score: 20, maxScore: 20, details: '' },
      };

      const sentiment: SentimentAnalysis = {
        overall: 'positive',
        scores: { positive: 80, negative: 10, neutral: 10 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.8,
      };

      const recommendation = (calculator as any).generateRecommendation(100, breakdown, sentiment);

      expect(recommendation).toContain('Excellent validation');
      expect(recommendation).toContain('strong market demand');
    });

    it('should recommend pivoting for poor validation', () => {
      const breakdown: ValidationScoreBreakdown = {
        searchVolume: { score: 0, maxScore: 20, details: '' },
        socialMentions: { score: 0, maxScore: 30, details: '' },
        sentiment: { score: 0, maxScore: 30, details: '' },
        competitorActivity: { score: 0, maxScore: 20, details: '' },
      };

      const sentiment: SentimentAnalysis = {
        overall: 'negative',
        scores: { positive: 10, negative: 70, neutral: 20 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.3,
      };

      const recommendation = (calculator as any).generateRecommendation(0, breakdown, sentiment);

      expect(recommendation).toContain('Poor validation scores');
      expect(recommendation).toContain('pivoting');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined signals gracefully', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [],
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date(),
      };

      const sentiment: SentimentAnalysis = {
        overall: 'neutral',
        scores: { positive: 33, negative: 33, neutral: 34 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0,
      };

      const result = calculator.calculate(marketScan, sentiment, 0);

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.searchVolume.score).toBe(0);
    });

    it('should handle extreme values', () => {
      const marketScan: MarketScanResult = {
        keywords: ['test'],
        signals: [
          {
            source: 'google-trends',
            mentions: 1000000,
            trend: 'increasing',
            relevance: 1,
            data: {},
            timestamp: new Date(),
          },
        ],
        totalMentions: 1000000,
        overallTrend: 'hot',
        scannedAt: new Date(),
      };

      const sentiment: SentimentAnalysis = {
        overall: 'positive',
        scores: { positive: 100, negative: 0, neutral: 0 },
        painPoints: Array(10).fill('pain'),
        desires: Array(10).fill('desire'),
        keyPhrases: Array(20).fill('phrase'),
        confidence: 1,
      };

      const result = calculator.calculate(marketScan, sentiment, 100);

      expect(result.total).toBe(100);
      expect(result.grade).toBe('A');
    });
  });
});
