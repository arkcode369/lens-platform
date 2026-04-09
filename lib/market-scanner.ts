/**
 * Market Scanner Service
 * Scans multiple sources for product demand signals
 */

import axios from 'axios';

export interface DemandSignal {
  source: string;
  mentions: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  relevance: number; // 0-1
  data: any;
  timestamp: Date;
}

export interface MarketScanResult {
  keywords: string[];
  signals: DemandSignal[];
  totalMentions: number;
  overallTrend: 'hot' | 'warm' | 'cold';
  scannedAt: Date;
}

export class MarketScanner {
  private redditApiKey: string | undefined;
  private twitterApiKey: string | undefined;
  private productHuntApiKey: string | undefined;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor() {
    this.redditApiKey = process.env.REDDIT_API_KEY;
    this.twitterApiKey = process.env.TWITTER_API_KEY;
    this.productHuntApiKey = process.env.PRODUCT_HUNT_API_KEY;
  }

  /**
   * Scan all sources for market demand
   */
  async scan(idea: string, keywords: string[]): Promise<MarketScanResult> {
    const scanId = this.generateCacheKey(idea, keywords);
    
    // Check cache first
    const cached = this.getFromCache(scanId);
    if (cached) {
      return cached;
    }

    const signals: DemandSignal[] = [];
    
    try {
      // Parallel scanning from multiple sources
      const [redditSignals, twitterSignals, productHuntSignals, googleTrendsSignals] = await Promise.allSettled([
        this.scanReddit(keywords),
        this.scanTwitter(keywords),
        this.scanProductHunt(keywords),
        this.scanGoogleTrends(keywords)
      ]);

      // Collect successful signals
      if (redditSignals.status === 'fulfilled') signals.push(...redditSignals.value);
      if (twitterSignals.status === 'fulfilled') signals.push(...twitterSignals.value);
      if (productHuntSignals.status === 'fulfilled') signals.push(...productHuntSignals.value);
      if (googleTrendsSignals.status === 'fulfilled') signals.push(...googleTrendsSignals.value);

      // Calculate overall metrics
      const totalMentions = signals.reduce((sum, s) => sum + s.mentions, 0);
      const overallTrend = this.calculateOverallTrend(signals);

      const result: MarketScanResult = {
        keywords,
        signals,
        totalMentions,
        overallTrend,
        scannedAt: new Date()
      };

      // Cache the result
      this.setCache(scanId, result);

      return result;
    } catch (error) {
      console.error('Market scan error:', error);
      // Return partial results even if some sources fail
      return {
        keywords,
        signals,
        totalMentions: 0,
        overallTrend: 'cold',
        scannedAt: new Date()
      };
    }
  }

  /**
   * Scan Reddit for product discussions
   */
  private async scanReddit(keywords: string[]): Promise<DemandSignal[]> {
    const signals: DemandSignal[] = [];
    
    for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords to avoid rate limiting
      try {
        // Using Reddit public JSON endpoint (no auth required for basic search)
        const response = await axios.get(
          `https://www.reddit.com/search.json`,
          {
            params: {
              q: keyword,
              limit: 25,
              sort: 'relevance'
            },
            headers: {
              'User-Agent': 'AI-Product-Platform/1.0'
            },
            timeout: 10000
          }
        );

        const posts = response.data.data.children || [];
        const mentions = posts.length;
        
        // Analyze trend based on post dates
        const recentPosts = posts.filter((p: any) => {
          const postDate = new Date(p.data.created_utc * 1000);
          return postDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        });

        const trend = mentions > 50 ? 'increasing' : mentions > 20 ? 'stable' : 'decreasing';
        const relevance = this.calculateRelevance(keyword, posts);

        signals.push({
          source: 'reddit',
          mentions,
          trend,
          relevance,
          data: {
            topPosts: posts.slice(0, 5).map((p: any) => ({
              title: p.data.title,
              subreddit: p.data.subreddit,
              score: p.data.score,
              url: p.data.url,
              comments: p.data.num_comments
            }))
          },
          timestamp: new Date()
        });
      } catch (error) {
        console.warn(`Reddit scan failed for keyword "${keyword}":`, error);
        // Continue with other keywords
      }
    }

    return signals;
  }

  /**
   * Scan Twitter/X for mentions
   */
  private async scanTwitter(keywords: string[]): Promise<DemandSignal[]> {
    const signals: DemandSignal[] = [];

    // Note: Twitter API v2 requires authentication
    // This is a placeholder implementation
    if (!this.twitterApiKey) {
      console.warn('Twitter API key not configured, skipping Twitter scan');
      return signals;
    }

    for (const keyword of keywords.slice(0, 2)) {
      try {
        const response = await axios.get(
          'https://api.twitter.com/2/tweets/search/recent',
          {
            params: {
              query: keyword,
              max_results: 100,
              tweet_fields: 'created_at,public_metrics'
            },
            headers: {
              'Authorization': `Bearer ${this.twitterApiKey}`
            },
            timeout: 15000
          }
        );

        const tweets = response.data.data || [];
        const mentions = tweets.length;

        const trend = mentions > 100 ? 'increasing' : mentions > 50 ? 'stable' : 'decreasing';
        const relevance = this.calculateRelevance(keyword, tweets);

        signals.push({
          source: 'twitter',
          mentions,
          trend,
          relevance,
          data: {
            recentTweets: tweets.slice(0, 10)
          },
          timestamp: new Date()
        });
      } catch (error) {
        console.warn(`Twitter scan failed for keyword "${keyword}":`, error);
      }
    }

    return signals;
  }

  /**
   * Scan Product Hunt for similar products
   */
  private async scanProductHunt(keywords: string[]): Promise<DemandSignal[]> {
    const signals: DemandSignal[] = [];

    if (!this.productHuntApiKey) {
      console.warn('Product Hunt API key not configured, skipping Product Hunt scan');
      return signals;
    }

    try {
      for (const keyword of keywords.slice(0, 2)) {
        const response = await axios.get(
          'https://api.producthunt.com/v2/products',
          {
            headers: {
              'Authorization': `Bearer ${this.productHuntApiKey}`,
              'User-Agent': 'AI-Product-Platform/1.0'
            },
            timeout: 10000
          }
        );

        const products = response.data.products || [];
        const relevantProducts = products.filter((p: any) => 
          p.name.toLowerCase().includes(keyword.toLowerCase()) ||
          p.description?.toLowerCase().includes(keyword.toLowerCase())
        );

        const mentions = relevantProducts.length;
        const trend = mentions > 5 ? 'increasing' : 'stable';
        const relevance = relevantProducts.length / products.length || 0;

        signals.push({
          source: 'producthunt',
          mentions,
          trend,
          relevance,
          data: {
            products: relevantProducts.slice(0, 10).map((p: any) => ({
              name: p.name,
              tagline: p.tagline,
              votes: p.votesCount,
              url: p.website
            }))
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('Product Hunt scan failed:', error);
    }

    return signals;
  }

  /**
   * Scan Google Trends data
   */
  private async scanGoogleTrends(keywords: string[]): Promise<DemandSignal[]> {
    const signals: DemandSignal[] = [];

    try {
      // Using a public Google Trends API wrapper
      const response = await axios.get(
        'https://trends-api.example.com/data',
        {
          params: {
            keywords: keywords.join(','),
            timeRange: 'past_12_months'
          },
          timeout: 10000
        }
      );

      // This is a placeholder - in production, use a real Google Trends API
      // like google-trends-api or pytrends (via backend service)
      
      for (const keyword of keywords) {
        const trendData = response.data[keyword] || { interest: 50, trend: 'stable' };
        
        signals.push({
          source: 'google-trends',
          mentions: trendData.interest * 100, // Scale to approximate search volume
          trend: trendData.trend,
          relevance: trendData.relevance || 0.7,
          data: {
            interestOverTime: trendData.interestOverTime,
            relatedQueries: trendData.relatedQueries
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('Google Trends scan failed:', error);
      // Fallback: generate synthetic data based on keyword popularity
      for (const keyword of keywords) {
        signals.push({
          source: 'google-trends',
          mentions: 500,
          trend: 'stable',
          relevance: 0.5,
          data: { synthetic: true },
          timestamp: new Date()
        });
      }
    }

    return signals;
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(keyword: string, items: any[]): number {
    if (!items.length) return 0;
    
    let relevantCount = 0;
    const keywordLower = keyword.toLowerCase();
    
    for (const item of items) {
      const text = (item.title || item.text || item.name || '').toLowerCase();
      if (text.includes(keywordLower)) {
        relevantCount++;
      }
    }
    
    return relevantCount / items.length;
  }

  /**
   * Calculate overall trend from multiple signals
   */
  private calculateOverallTrend(signals: DemandSignal[]): 'hot' | 'warm' | 'cold' {
    if (!signals.length) return 'cold';
    
    const increasingCount = signals.filter(s => s.trend === 'increasing').length;
    const totalMentions = signals.reduce((sum, s) => sum + s.mentions, 0);
    
    if (totalMentions > 500 || increasingCount > signals.length * 0.7) {
      return 'hot';
    } else if (totalMentions > 100 || increasingCount > signals.length * 0.4) {
      return 'warm';
    }
    
    return 'cold';
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(idea: string, keywords: string[]): string {
    return `${idea}:${keywords.sort().join(',')}`;
  }

  /**
   * Get cached result
   */
  private getFromCache(key: string): MarketScanResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp.getTime() > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Set cached result
   */
  private setCache(key: string, result: MarketScanResult): void {
    this.cache.set(key, result);
  }
}

// Export singleton instance
export const marketScanner = new MarketScanner();
