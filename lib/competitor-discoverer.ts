/**
 * Competitor Discovery Service
 * Finds and analyzes competitors for a product idea
 */

import axios from 'axios';

export interface Competitor {
  name: string;
  url: string;
  description: string;
  features: CompetitorFeature[];
  pricing: CompetitorPricing[];
  strengths: string[];
  weaknesses: string[];
  swot?: SWOTAnalysis;
  relevanceScore: number; // 0-1
}

export interface CompetitorFeature {
  name: string;
  description: string;
  status: 'available' | 'planned' | 'missing';
}

export interface CompetitorPricing {
  plan: string;
  price: number | null;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one-time' | 'freemium' | 'free';
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitorDiscoveryResult {
  competitors: Competitor[];
  featureMatrix: FeatureMatrix;
  pricingAnalysis: PricingAnalysis;
  swot: SWOTAnalysis;
  analyzedAt: Date;
}

export interface FeatureMatrix {
  features: string[];
  matrix: {
    [competitorName: string]: {
      [featureName: string]: boolean;
    };
  };
}

export interface PricingAnalysis {
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  freeOptions: number;
  pricingTiers: string[];
}

export class CompetitorDiscoverer {
  private readonly PRODUCT_HUNT_API_KEY = process.env.PRODUCT_HUNT_API_KEY;
  private readonly SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;

  /**
   * Discover competitors for a product idea
   */
  async discover(idea: string, keywords: string[]): Promise<CompetitorDiscoveryResult> {
    const competitors: Competitor[] = [];
    
    try {
      // Parallel competitor discovery from multiple sources
      const [productHuntCompetitors, googleCompetitors, alternativeToCompetitors] = await Promise.allSettled([
        this.searchProductHunt(keywords),
        this.searchGoogleAlternatives(keywords),
        this.searchAlternativeTo(keywords)
      ]);

      // Collect competitors from all sources
      if (productHuntCompetitors.status === 'fulfilled') {
        competitors.push(...productHuntCompetitors.value);
      }
      if (googleCompetitors.status === 'fulfilled') {
        competitors.push(...googleCompetitors.value);
      }
      if (alternativeToCompetitors.status === 'fulfilled') {
        competitors.push(...alternativeToCompetitors.value);
      }

      // Remove duplicates by URL
      const uniqueCompetitors = this.dedupeCompetitors(competitors);

      // Analyze each competitor
      const analyzedCompetitors = await Promise.all(
        uniqueCompetitors.slice(0, 15).map(c => this.analyzeCompetitor(c, idea))
      );

      // Build feature matrix
      const featureMatrix = this.buildFeatureMatrix(analyzedCompetitors);

      // Analyze pricing
      const pricingAnalysis = this.analyzePricing(analyzedCompetitors);

      // Generate SWOT
      const swot = this.generateSWOT(analyzedCompetitors, idea);

      return {
        competitors: analyzedCompetitors,
        featureMatrix,
        pricingAnalysis,
        swot,
        analyzedAt: new Date()
      };
    } catch (error) {
      console.error('Competitor discovery error:', error);
      return {
        competitors: [],
        featureMatrix: { features: [], matrix: {} },
        pricingAnalysis: {
          minPrice: null,
          maxPrice: null,
          avgPrice: null,
          freeOptions: 0,
          pricingTiers: []
        },
        swot: this.createEmptySWOT(),
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Search Product Hunt for similar products
   */
  private async searchProductHunt(keywords: string[]): Promise<Competitor[]> {
    const competitors: Competitor[] = [];

    if (!this.PRODUCT_HUNT_API_KEY) {
      console.warn('Product Hunt API key not configured');
      return competitors;
    }

    try {
      for (const keyword of keywords.slice(0, 3)) {
        const response = await axios.get(
          'https://api.producthunt.com/v2/products',
          {
            headers: {
              'Authorization': `Bearer ${this.PRODUCT_HUNT_API_KEY}`,
              'User-Agent': 'AI-Product-Platform/1.0'
            },
            timeout: 10000
          }
        );

        const products = response.data.products || [];
        
        for (const product of products) {
          const relevance = this.calculateRelevance(keyword, product);
          if (relevance > 0.3) {
            competitors.push({
              name: product.name,
              url: product.website || `https://www.producthunt.com/posts/${product.slug}`,
              description: product.tagline || '',
              features: [],
              pricing: [],
              strengths: [],
              weaknesses: [],
              relevanceScore: relevance
            });
          }
        }
      }
    } catch (error) {
      console.warn('Product Hunt search failed:', error);
    }

    return competitors;
  }

  /**
   * Search Google for "alternatives to" queries
   */
  private async searchGoogleAlternatives(keywords: string[]): Promise<Competitor[]> {
    const competitors: Competitor[] = [];

    // This would use a search API like Google Custom Search API
    // For now, we'll use a placeholder
    if (!this.SEARCH_API_KEY) {
      console.warn('Search API key not configured');
      return competitors;
    }

    try {
      for (const keyword of keywords.slice(0, 2)) {
        const response = await axios.get(
          'https://www.googleapis.com/customsearch/v1',
          {
            params: {
              key: this.SEARCH_API_KEY,
              cx: process.env.GOOGLE_CSE_ID,
              q: `alternatives to ${keyword}`,
              num: 10
            },
            timeout: 10000
          }
        );

        const results = response.data.items || [];
        
        for (const result of results) {
          competitors.push({
            name: result.title,
            url: result.link,
            description: result.snippet,
            features: [],
            pricing: [],
            strengths: [],
            weaknesses: [],
            relevanceScore: 0.6
          });
        }
      }
    } catch (error) {
      console.warn('Google alternatives search failed:', error);
    }

    return competitors;
  }

  /**
   * Search AlternativeTo.net for similar products
   */
  private async searchAlternativeTo(keywords: string[]): Promise<Competitor[]> {
    const competitors: Competitor[] = [];

    try {
      for (const keyword of keywords.slice(0, 2)) {
        // AlternativeTo has a public API
        const response = await axios.get(
          `https://alternativeto.net/software/${keyword}/`,
          {
            timeout: 10000
          }
        );

        // This would require web scraping
        // For now, return empty
      }
    } catch (error) {
      console.warn('AlternativeTo search failed:', error);
    }

    return competitors;
  }

  /**
   * Analyze a single competitor in depth
   */
  private async analyzeCompetitor(competitor: Competitor, idea: string): Promise<Competitor> {
    try {
      // Fetch competitor website for more details
      const websiteData = await this.fetchWebsiteData(competitor.url);

      // Extract features from website
      const features = this.extractFeatures(websiteData, competitor.name);

      // Extract pricing information
      const pricing = this.extractPricing(websiteData);

      // Analyze strengths and weaknesses
      const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses(
        websiteData,
        competitor.description
      );

      return {
        ...competitor,
        description: websiteData.description || competitor.description,
        features,
        pricing,
        strengths,
        weaknesses,
        relevanceScore: competitor.relevanceScore
      };
    } catch (error) {
      console.warn(`Failed to analyze competitor ${competitor.name}:`, error);
      return competitor;
    }
  }

  /**
   * Fetch and parse competitor website data
   */
  private async fetchWebsiteData(url: string): Promise<{
    description: string;
    content: string;
    titles: string[];
  }> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5
      });

      const html = response.data;
      
      // Extract description from meta tags
      const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      const description = descriptionMatch?.[1] || '';

      // Extract main content (simplified)
      const content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 10000);

      // Extract headings
      const titleMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
      const titles = Array.from(titleMatches).map(m => m[1].trim());

      return {
        description,
        content,
        titles
      };
    } catch (error) {
      console.warn(`Failed to fetch website ${url}:`, error);
      return {
        description: '',
        content: '',
        titles: []
      };
    }
  }

  /**
   * Extract features from website content
   */
  private extractFeatures(websiteData: any, competitorName: string): CompetitorFeature[] {
    const features: CompetitorFeature[] = [];
    const content = websiteData.content.toLowerCase();
    const titles = websiteData.titles.join(' ').toLowerCase();

    // Common feature keywords to look for
    const featureKeywords = [
      'api', 'integration', 'automation', 'analytics', 'dashboard',
      'reporting', 'collaboration', 'mobile', 'cloud', 'export',
      'import', 'template', 'workflow', 'notification', 'search',
      'filter', 'schedule', 'reminder', 'team', 'permission'
    ];

    for (const keyword of featureKeywords) {
      if (content.includes(keyword) || titles.includes(keyword)) {
        features.push({
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          description: `${competitorName} offers ${keyword} functionality`,
          status: 'available'
        });
      }
    }

    return features.slice(0, 20);
  }

  /**
   * Extract pricing information
   */
  private extractPricing(websiteData: any): CompetitorPricing[] {
    const pricing: CompetitorPricing[] = [];
    const content = websiteData.content;

    // Look for pricing patterns
    const pricePatterns = [
      /\$(\d+)\s*(?:per\s+)?month/i,
      /\$(\d+)\s*(?:per\s+)?year/i,
      /free\s*(?:plan|tier)?/i,
      /starting\s*at\s*\$(\d+)/i
    ];

    for (const pattern of pricePatterns) {
      const match = content.match(pattern);
      if (match) {
        if (pattern.source.includes('free')) {
          pricing.push({
            plan: 'Free',
            price: 0,
            currency: 'USD',
            billingCycle: 'freemium'
          });
        } else if (match[1]) {
          const price = parseInt(match[1]);
          pricing.push({
            plan: 'Standard',
            price,
            currency: 'USD',
            billingCycle: pattern.source.includes('year') ? 'yearly' : 'monthly'
          });
        }
      }
    }

    return pricing.length > 0 ? pricing : [{
      plan: 'Unknown',
      price: null,
      currency: 'USD',
      billingCycle: 'monthly'
    }];
  }

  /**
   * Analyze strengths and weaknesses
   */
  private analyzeStrengthsWeaknesses(websiteData: any, description: string): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const content = (websiteData.content + ' ' + description).toLowerCase();

    // Strength indicators
    const strengthIndicators = [
      { pattern: /(?:best|top|leading|popular|trusted)/i, text: 'Market leader' },
      { pattern: /(?:easy|simple|intuitive|user-friendly)/i, text: 'User-friendly interface' },
      { pattern: /(?:powerful|advanced|comprehensive)/i, text: 'Feature-rich' },
      { pattern: /(?:affordable|reasonable|competitive)/i, text: 'Competitive pricing' },
      { pattern: /(?:24\/7|support|help)/i, text: 'Good customer support' },
      { pattern: /(?:integrat|connect)/i, text: 'Strong integrations' }
    ];

    // Weakness indicators
    const weaknessIndicators = [
      { pattern: /(?:limited|basic|lacking)/i, text: 'Limited features' },
      { pattern: /(?:expensive|premium|costly)/i, text: 'Expensive pricing' },
      { pattern: /(?:complex|complicated|steep)/i, text: 'Steep learning curve' },
      { pattern: /(?:slow|performance)/i, text: 'Performance issues' },
      { pattern: /(?:bug|error|issue)/i, text: 'Technical issues' }
    ];

    for (const indicator of strengthIndicators) {
      if (indicator.pattern.test(content)) {
        strengths.push(indicator.text);
      }
    }

    for (const indicator of weaknessIndicators) {
      if (indicator.pattern.test(content)) {
        weaknesses.push(indicator.text);
      }
    }

    return { strengths, weaknesses };
  }

  /**
   * Build feature matrix from competitors
   */
  private buildFeatureMatrix(competitors: Competitor[]): FeatureMatrix {
    const featureSet = new Set<string>();
    
    for (const competitor of competitors) {
      for (const feature of competitor.features) {
        featureSet.add(feature.name);
      }
    }

    const features = Array.from(featureSet);
    const matrix: { [key: string]: { [key: string]: boolean } } = {};

    for (const competitor of competitors) {
      matrix[competitor.name] = {};
      for (const feature of features) {
        matrix[competitor.name][feature] = competitor.features.some(f => f.name === feature);
      }
    }

    return { features, matrix };
  }

  /**
   * Analyze pricing across competitors
   */
  private analyzePricing(competitors: Competitor[]): PricingAnalysis {
    const prices = competitors
      .flatMap(c => c.pricing)
      .filter(p => p.price !== null && p.price !== undefined)
      .map(p => p.price!)
      .filter(p => p > 0);

    const freeOptions = competitors
      .flatMap(c => c.pricing)
      .filter(p => p.price === 0).length;

    const pricingTiers = Array.from(new Set(
      competitors.flatMap(c => c.pricing.map(p => p.plan))
    ));

    return {
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      maxPrice: prices.length > 0 ? Math.max(...prices) : null,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
      freeOptions,
      pricingTiers: pricingTiers.slice(0, 10)
    };
  }

  /**
   * Generate SWOT analysis
   */
  private generateSWOT(competitors: Competitor[], idea: string): SWOTAnalysis {
    const allStrengths = competitors.flatMap(c => c.strengths);
    const allWeaknesses = competitors.flatMap(c => c.weaknesses);

    // Find common patterns
    const strengthCounts: Record<string, number> = {};
    const weaknessCounts: Record<string, number> = {};

    for (const strength of allStrengths) {
      strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
    }

    for (const weakness of allWeaknesses) {
      weaknessCounts[weakness] = (weaknessCounts[weakness] || 0) + 1;
    }

    // Opportunities: gaps in the market
    const opportunities = [
      'Underserved market segments',
      'Emerging technology trends',
      'Pricing gaps in the market',
      'Feature combinations not offered by competitors',
      'Better customer support opportunities'
    ];

    // Threats: common competitor strengths
    const threats = Object.entries(strengthCounts)
      .filter(([_, count]) => count >= 2)
      .map(([strength]) => strength)
      .slice(0, 5);

    return {
      strengths: Object.entries(strengthCounts)
        .filter(([_, count]) => count >= 2)
        .map(([strength]) => strength)
        .slice(0, 5),
      weaknesses: Object.entries(weaknessCounts)
        .filter(([_, count]) => count >= 2)
        .map(([weakness]) => weakness)
        .slice(0, 5),
      opportunities,
      threats
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(keyword: string, product: any): number {
    const name = (product.name || '').toLowerCase();
    const description = (product.tagline || '').toLowerCase();
    const keywords = keyword.toLowerCase();

    let score = 0;
    
    if (name.includes(keywords)) score += 0.5;
    if (description.includes(keywords)) score += 0.3;
    if (product.topics?.some((t: any) => t.name?.includes(keywords))) score += 0.2;

    return score;
  }

  /**
   * Remove duplicate competitors
   */
  private dedupeCompetitors(competitors: Competitor[]): Competitor[] {
    const seen = new Set<string>();
    return competitors.filter(c => {
      const key = c.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Create empty SWOT
   */
  private createEmptySWOT(): SWOTAnalysis {
    return {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };
  }
}

// Export singleton instance
export const competitorDiscoverer = new CompetitorDiscoverer();
