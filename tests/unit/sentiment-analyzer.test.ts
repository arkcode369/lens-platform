import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SentimentAnalyzer, SentimentAnalysis } from '@/lib/sentiment-analyzer';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const axios = await import('axios');

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should analyze positive sentiment correctly', async () => {
      const text = 'I love this product! It\'s amazing and works perfectly.';

      const result = await analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.scores.positive).toBeGreaterThan(result.scores.negative);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should analyze negative sentiment correctly', async () => {
      const text = 'This is terrible. I hate it and it\'s broken.';

      const result = await analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.scores.negative).toBeGreaterThan(result.scores.positive);
    });

    it('should handle empty text', async () => {
      const result = await analyzer.analyze('');

      expect(result.overall).toBe('neutral');
      expect(result.painPoints).toHaveLength(0);
      expect(result.desires).toHaveLength(0);
    });

    it('should extract pain points from text', async () => {
      const text = 'I\'m frustrated with the complicated interface. It\'s too expensive and slow.';

      const result = await analyzer.analyze(text);

      expect(result.painPoints.length).toBeGreaterThan(0);
    });

    it('should extract desires from text', async () => {
      const text = 'I wish it was easier to use. Would be great if it was faster and more affordable.';

      const result = await analyzer.analyze(text);

      expect(result.desires.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze multiple texts and aggregate results', async () => {
      const texts = [
        'I love this product!',
        'It\'s amazing and helpful.',
        'Highly recommend to everyone.',
      ];

      const result = await analyzer.analyzeBatch(texts);

      expect(result).toBeDefined();
      expect(result.overall).toBe('positive');
      expect(result.scores.positive).toBeGreaterThan(50);
    });

    it('should handle empty array', async () => {
      const result = await analyzer.analyzeBatch([]);

      expect(result.overall).toBe('neutral');
      expect(result.scores.positive).toBe(33);
    });
  });

  describe('analyzeWithRules', () => {
    it('should detect positive words', () => {
      const text = 'The product is excellent, great, and fantastic.';

      const result = (analyzer as any).analyzeWithRules(text);

      expect(result.scores.positive).toBeGreaterThan(50);
    });

    it('should detect negative words', () => {
      const text = 'This is terrible, awful, and horrible.';

      const result = (analyzer as any).analyzeWithRules(text);

      expect(result.scores.negative).toBeGreaterThan(50);
    });

    it('should handle mixed sentiment', () => {
      const text = 'It\'s great but also frustrating sometimes.';

      const result = (analyzer as any).analyzeWithRules(text);

      expect(result.scores.positive).toBeGreaterThan(0);
      expect(result.scores.negative).toBeGreaterThan(0);
    });
  });

  describe('extractPatterns', () => {
    it('should extract pain point patterns', () => {
      const text = 'I\'m frustrated with the slow performance. Having trouble with the interface.';

      const painPointPatterns = [
        /(?:frustrat|annoy|disappoint|hate|tired of|wish|if only|why can't|can't seem to|struggle with|having trouble|difficult to|hard to)/i,
      ];

      const result = (analyzer as any).extractPatterns(text, painPointPatterns);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract desire patterns', () => {
      const text = 'I want something easier. Would be great if it was faster.';

      const desirePatterns = [
        /(?:want|need|hope|dream|ideal|perfect|would be great|wish for)/i,
      ];

      const result = (analyzer as any).extractPatterns(text, desirePatterns);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractKeyPhrases', () => {
    it('should extract important words from text', () => {
      const text = 'The product management dashboard provides excellent analytics and reporting features.';

      const result = (analyzer as any).extractKeyPhrases(text);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('product');
    });

    it('should filter out short words', () => {
      const text = 'a an the is are was were be been being';

      const result = (analyzer as any).extractKeyPhrases(text);

      expect(result).toHaveLength(0);
    });
  });

  describe('aggregateAnalyses', () => {
    it('should average multiple analyses', () => {
      const analyses: SentimentAnalysis[] = [
        {
          overall: 'positive',
          scores: { positive: 80, negative: 10, neutral: 10 },
          painPoints: ['point1'],
          desires: ['desire1'],
          keyPhrases: ['phrase1'],
          confidence: 0.8,
        },
        {
          overall: 'positive',
          scores: { positive: 60, negative: 20, neutral: 20 },
          painPoints: ['point2'],
          desires: ['desire2'],
          keyPhrases: ['phrase2'],
          confidence: 0.6,
        },
      ];

      const result = (analyzer as any).aggregateAnalyses(analyses);

      expect(result.scores.positive).toBe(70);
      expect(result.scores.negative).toBe(15);
      expect(result.confidence).toBe(0.7);
    });

    it('should remove duplicate pain points and desires', () => {
      const analyses: SentimentAnalysis[] = [
        {
          overall: 'neutral',
          scores: { positive: 33, negative: 33, neutral: 34 },
          painPoints: ['same point'],
          desires: ['same desire'],
          keyPhrases: ['same phrase'],
          confidence: 0.5,
        },
        {
          overall: 'neutral',
          scores: { positive: 33, negative: 33, neutral: 34 },
          painPoints: ['same point'],
          desires: ['same desire'],
          keyPhrases: ['same phrase'],
          confidence: 0.5,
        },
      ];

      const result = (analyzer as any).aggregateAnalyses(analyses);

      expect(result.painPoints).toHaveLength(1);
      expect(result.desires).toHaveLength(1);
    });
  });

  describe('normalizeAnalysis', () => {
    it('should normalize LLM response correctly', () => {
      const llmResponse = {
        overall: 'positive',
        scores: { positive: 80, negative: 10, neutral: 10 },
        painPoints: ['pain1', 'pain2'],
        desires: ['desire1'],
        keyPhrases: ['phrase1', 'phrase2', 'phrase3'],
        confidence: 0.85,
      };

      const result = (analyzer as any).normalizeAnalysis(llmResponse);

      expect(result.overall).toBe('positive');
      expect(result.scores.positive).toBe(80);
      expect(result.confidence).toBe(0.85);
    });

    it('should handle invalid overall sentiment', () => {
      const llmResponse = {
        overall: 'invalid',
        scores: { positive: 50, negative: 25, neutral: 25 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 0.5,
      };

      const result = (analyzer as any).normalizeAnalysis(llmResponse);

      expect(result.overall).toBe('neutral');
    });

    it('should clamp scores to valid range', () => {
      const llmResponse = {
        overall: 'positive',
        scores: { positive: 150, negative: -10, neutral: 200 },
        painPoints: [],
        desires: [],
        keyPhrases: [],
        confidence: 1.5,
      };

      const result = (analyzer as any).normalizeAnalysis(llmResponse);

      expect(result.scores.positive).toBe(100);
      expect(result.scores.negative).toBe(0);
      expect(result.confidence).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', async () => {
      const text = 'Good '.repeat(1000);

      const result = await analyzer.analyze(text);

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle special characters', async () => {
      const text = '!!!??? @#$%^&*() Mixed content with 🎉 emojis';

      const result = await analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.scores.positive + result.scores.negative + result.scores.neutral).toBe(100);
    });

    it('should handle unicode text', async () => {
      const text = 'これは素晴らしい製品です！';

      const result = await analyzer.analyze(text);

      expect(result).toBeDefined();
    });
  });
});
