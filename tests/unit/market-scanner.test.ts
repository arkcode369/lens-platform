import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketScanner, MarketScanResult, DemandSignal } from '@/lib/market-scanner';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const axios = await import('axios');

describe('MarketScanner', () => {
  let scanner: MarketScanner;

  beforeEach(() => {
    scanner = new MarketScanner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scan', () => {
    it('should scan multiple sources in parallel', async () => {
      const mockRedditResponse = {
        data: {
          data: {
            children: [
              { data: { title: 'Post 1', subreddit: 'test', score: 100, url: 'url1', num_comments: 10, created_utc: Date.now() / 1000 } },
            ],
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockRedditResponse);

      const result = await scanner.scan('Test Idea', ['keyword1', 'keyword2']);

      expect(result).toBeDefined();
      expect(result.keywords).toEqual(['keyword1', 'keyword2']);
      expect(result.signals).toBeDefined();
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should return cached results for same query', async () => {
      const mockRedditResponse = {
        data: {
          data: {
            children: [],
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockRedditResponse);

      const firstResult = await scanner.scan('Cached Idea', ['cache-key']);
      const secondResult = await scanner.scan('Cached Idea', ['cache-key']);

      expect(firstResult).toEqual(secondResult);
    });

    it('should handle failed sources gracefully', async () => {
      (axios.default.get as any).mockRejectedValue(new Error('Network error'));

      const result = await scanner.scan('Test Idea', ['keyword']);

      expect(result).toBeDefined();
      expect(result.overallTrend).toBe('cold');
      expect(result.signals).toBeDefined();
    });

    it('should calculate overall trend correctly', async () => {
      const mockRedditResponse = {
        data: {
          data: {
            children: Array(60).fill({ data: { title: 'Post', subreddit: 'test', score: 100, url: 'url', num_comments: 10, created_utc: Date.now() / 1000 } }),
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockRedditResponse);

      const result = await scanner.scan('Hot Idea', ['trending']);

      expect(result.overallTrend).toBe('hot');
    });
  });

  describe('scanReddit', () => {
    it('should return signals from Reddit search', async () => {
      const mockPosts = Array(25).fill({
        data: {
          title: 'Test Post',
          subreddit: 'test',
          score: 100,
          url: 'https://reddit.com/test',
          num_comments: 10,
          created_utc: Date.now() / 1000,
        },
      });

      (axios.default.get as any).mockResolvedValue({
        data: {
          data: {
            children: mockPosts,
          },
        },
      });

      const signals = await (scanner as any).scanReddit(['test-keyword']);

      expect(signals).toHaveLength(1);
      expect(signals[0].source).toBe('reddit');
      expect(signals[0].mentions).toBe(25);
      expect(signals[0].trend).toBeDefined();
      expect(signals[0].relevance).toBeGreaterThanOrEqual(0);
      expect(signals[0].relevance).toBeLessThanOrEqual(1);
    });

    it('should handle empty results', async () => {
      (axios.default.get as any).mockResolvedValue({
        data: {
          data: {
            children: [],
          },
        },
      });

      const signals = await (scanner as any).scanReddit(['no-results']);

      expect(signals).toHaveLength(1);
      expect(signals[0].mentions).toBe(0);
    });

    it('should handle API errors', async () => {
      (axios.default.get as any).mockRejectedValue(new Error('API Error'));

      const signals = await (scanner as any).scanReddit(['error-keyword']);

      expect(signals).toHaveLength(0);
    });
  });

  describe('scanTwitter', () => {
    it('should skip if API key not configured', async () => {
      delete process.env.TWITTER_API_KEY;
      const scannerWithoutKey = new MarketScanner();

      const signals = await (scannerWithoutKey as any).scanTwitter(['keyword']);

      expect(signals).toHaveLength(0);
    });

    it('should return signals when API key is configured', async () => {
      process.env.TWITTER_API_KEY = 'test-key';
      const scannerWithKey = new MarketScanner();

      (axios.default.get as any).mockResolvedValue({
        data: {
          data: Array(50).fill({ text: 'Tweet text', created_at: new Date().toISOString(), public_metrics: { retweet_count: 10, like_count: 20 } }),
        },
      });

      const signals = await (scannerWithKey as any).scanTwitter(['keyword']);

      expect(signals).toHaveLength(1);
      expect(signals[0].source).toBe('twitter');
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate relevance score correctly', () => {
      const items = [
        { title: 'keyword in title' },
        { title: 'no match here' },
        { name: 'keyword mentioned' },
      ];

      const relevance = (scanner as any).calculateRelevance('keyword', items);

      expect(relevance).toBe(2 / 3);
    });

    it('should return 0 for empty items', () => {
      const relevance = (scanner as any).calculateRelevance('keyword', []);

      expect(relevance).toBe(0);
    });
  });

  describe('calculateOverallTrend', () => {
    it('should return hot for high mentions', () => {
      const signals: DemandSignal[] = [
        { source: 'reddit', mentions: 300, trend: 'increasing', relevance: 0.8, data: {}, timestamp: new Date() },
        { source: 'twitter', mentions: 300, trend: 'increasing', relevance: 0.8, data: {}, timestamp: new Date() },
      ];

      const trend = (scanner as any).calculateOverallTrend(signals);

      expect(trend).toBe('hot');
    });

    it('should return cold for no signals', () => {
      const trend = (scanner as any).calculateOverallTrend([]);

      expect(trend).toBe('cold');
    });

    it('should return warm for moderate activity', () => {
      const signals: DemandSignal[] = [
        { source: 'reddit', mentions: 60, trend: 'stable', relevance: 0.5, data: {}, timestamp: new Date() },
      ];

      const trend = (scanner as any).calculateOverallTrend(signals);

      expect(trend).toBe('warm');
    });
  });

  describe('cache operations', () => {
    it('should cache results', async () => {
      const mockRedditResponse = {
        data: {
          data: {
            children: [],
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockRedditResponse);

      await scanner.scan('Cache Test', ['cache']);

      // Verify cache was set
      const cached = (scanner as any).cache.get('Cache Test:cache');
      expect(cached).toBeDefined();
    });

    it('should expire old cache entries', async () => {
      const mockRedditResponse = {
        data: {
          data: {
            children: [],
          },
        },
      };

      (axios.default.get as any).mockResolvedValue(mockRedditResponse);

      // Create a cache entry with old timestamp
      const key = scanner.generateCacheKey('Old Cache', ['old']);
      (scanner as any).cache.set(key, {
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      });

      // Try to get from cache - should return null due to expiration
      const cached = (scanner as any).getFromCache(key);
      expect(cached).toBeNull();
    });
  });
});
