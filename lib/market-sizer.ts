/**
 * Market Sizer Service
 * Calculates TAM, SAM, SOM for market opportunity
 */

import axios from 'axios';

export interface MarketSize {
  tam: number | null;      // Total Addressable Market in USD
  sam: number | null;      // Serviceable Addressable Market in USD
  som: number | null;      // Serviceable Obtainable Market in USD
  growthRate: number | null; // Annual growth rate %
  confidence: number;      // 0-1 confidence score
  sources: MarketSource[];
  calculations: MarketCalculations;
}

export interface MarketSource {
  name: string;
  url?: string;
  date?: string;
  type: 'industry-report' | 'government-data' | 'market-research' | 'estimated';
}

export interface MarketCalculations {
  tamBasis: string;
  samBasis: string;
  somBasis: string;
  assumptions: string[];
}

export class MarketSizer {
  private readonly MARKET_DATA_API_KEY = process.env.MARKET_DATA_API_KEY;

  /**
   * Calculate market size metrics
   */
  async calculate(
    industry: string,
    targetAudience: string,
    geographicFocus: string = 'global'
  ): Promise<MarketSize> {
    try {
      // Gather data from multiple sources
      const [industryData, demographicData, competitorData] = await Promise.allSettled([
        this.fetchIndustryData(industry),
        this.fetchDemographicData(targetAudience, geographicFocus),
        this.fetchCompetitorData(industry)
      ]);

      // Calculate TAM
      const tam = this.calculateTAM(industryData, demographicData);
      
      // Calculate SAM
      const sam = this.calculateSAM(tam, geographicFocus, targetAudience);
      
      // Calculate SOM
      const som = this.calculateSOM(sam, competitorData);

      // Estimate growth rate
      const growthRate = this.estimateGrowthRate(industry);

      // Calculate confidence
      const confidence = this.calculateConfidence(
        industryData, 
        demographicData, 
        competitorData
      );

      // Gather sources
      const sources = this.gatherSources(
        industryData, 
        demographicData, 
        competitorData
      );

      return {
        tam,
        sam,
        som,
        growthRate,
        confidence,
        sources,
        calculations: {
          tamBasis: this.getTAMBasis(industryData, demographicData),
          samBasis: this.getSAMBasis(geographicFocus, targetAudience),
          somBasis: this.getSOMBasis(competitorData),
          assumptions: this.generateAssumptions(industry, targetAudience, geographicFocus)
        }
      };
    } catch (error) {
      console.error('Market sizing error:', error);
      return this.createDefaultMarketSize(industry);
    }
  }

  /**
   * Calculate Total Addressable Market
   */
  private calculateTAM(
    industryData: any,
    demographicData: any
  ): number | null {
    // Method 1: Use industry report data
    if (industryData?.marketSize) {
      return industryData.marketSize;
    }

    // Method 2: Top-down approach (population × penetration × price)
    if (demographicData?.targetPopulation) {
      const population = demographicData.targetPopulation;
      const penetrationRate = demographicData.penetrationRate || 0.1; // 10% default
      const avgAnnualSpend = demographicData.avgAnnualSpend || 100;
      
      return Math.round(population * penetrationRate * avgAnnualSpend);
    }

    // Method 3: Bottom-up approach (competitor revenue sum)
    if (industryData?.competitorRevenue) {
      return Math.round(industryData.competitorRevenue * 1.5); // Add estimated unmeasured competitors
    }

    return null;
  }

  /**
   * Calculate Serviceable Addressable Market
   */
  private calculateSAM(
    tam: number | null,
    geographicFocus: string,
    targetAudience: string
  ): number | null {
    if (!tam) return null;

    // Geographic filter
    let geoMultiplier = 1.0;
    const geoLower = geographicFocus.toLowerCase();
    
    if (geoLower === 'united states' || geoLower === 'us') {
      geoMultiplier = 0.4; // US is ~40% of global tech market
    } else if (geoLower === 'europe') {
      geoMultiplier = 0.3;
    } else if (geoLower === 'asia') {
      geoMultiplier = 0.35;
    } else if (geoLower === 'north america') {
      geoMultiplier = 0.45;
    }

    // Target audience filter (segment specificity)
    let segmentMultiplier = 0.5; // Default to 50% of geo market
    const segmentKeywords = [
      'enterprise', 'b2b', 'small business', 'consumer', 'enterprise only'
    ];

    for (const keyword of segmentKeywords) {
      if (targetAudience.toLowerCase().includes(keyword)) {
        segmentMultiplier = this.getSegmentMultiplier(keyword);
        break;
      }
    }

    return Math.round(tam * geoMultiplier * segmentMultiplier);
  }

  /**
   * Calculate Serviceable Obtainable Market
   */
  private calculateSOM(
    sam: number | null,
    competitorData: any
  ): number | null {
    if (!sam) return null;

    // Realistic market share based on:
    // - Number of competitors
    // - Market maturity
    // - Entry barriers
    
    const competitorCount = competitorData?.count || 10;
    let marketSharePercent = 0.05; // Default 5%

    if (competitorCount > 50) {
      marketSharePercent = 0.02; // Fragmented market, harder to capture share
    } else if (competitorCount > 20) {
      marketSharePercent = 0.03;
    } else if (competitorCount > 10) {
      marketSharePercent = 0.04;
    } else if (competitorCount <= 5) {
      marketSharePercent = 0.08; // Less competition, more opportunity
    }

    // Adjust for market maturity
    marketSharePercent *= 0.8; // Conservative 80% of theoretical max

    return Math.round(sam * marketSharePercent);
  }

  /**
   * Estimate market growth rate
   */
  private estimateGrowthRate(industry: string): number | null {
    const industryLower = industry.toLowerCase();

    // Industry-specific growth rates (based on historical data)
    const growthRates: Record<string, number> = {
      'ai': 37,
      'artificial intelligence': 37,
      'saas': 18,
      'software': 12,
      'e-commerce': 23,
      'fintech': 20,
      'healthtech': 15,
      'edtech': 16,
      'cryptocurrency': 45,
      'blockchain': 40,
      'cybersecurity': 13,
      'cloud': 22,
      'mobile': 8,
      'social media': 10,
      'gaming': 12,
      'streaming': 21,
      'remote work': 25,
      'productivity': 14
    };

    for (const [keyword, rate] of Object.entries(growthRates)) {
      if (industryLower.includes(keyword)) {
        return rate;
      }
    }

    // Default to global GDP + tech premium
    return 10; // 10% annual growth
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    industryData: any,
    demographicData: any,
    competitorData: any
  ): number {
    let confidence = 0.3; // Base confidence

    // Industry data quality
    if (industryData?.marketSize) confidence += 0.2;
    if (industryData?.sources?.length > 0) confidence += 0.1;
    if (industryData?.year && industryData.year > 2023) confidence += 0.1;

    // Demographic data quality
    if (demographicData?.targetPopulation) confidence += 0.1;
    if (demographicData?.sources?.length > 0) confidence += 0.1;

    // Competitor data
    if (competitorData?.count && competitorData.count > 0) confidence += 0.1;

    return Math.min(1.0, Math.round(confidence * 100) / 100);
  }

  /**
   * Gather data sources
   */
  private gatherSources(
    industryData: any,
    demographicData: any,
    competitorData: any
  ): MarketSource[] {
    const sources: MarketSource[] = [];

    if (industryData?.sources) {
      sources.push(...industryData.sources);
    }

    if (demographicData?.sources) {
      sources.push(...demographicData.sources);
    }

    // Add standard sources
    sources.push({
      name: 'Industry Analysis',
      type: 'market-research',
      date: new Date().toISOString()
    });

    return sources.slice(0, 10);
  }

  /**
   * Fetch industry data
   */
  private async fetchIndustryData(industry: string): Promise<any> {
    // In production, integrate with:
    // - Statista API
    // - Gartner
    // - Forrester
    // - IBISWorld
    // - Grand View Research

    // For now, return estimated data based on industry
    const industryEstimates: Record<string, { marketSize: number; year: number }> = {
      'ai': { marketSize: 196000000000, year: 2024 }, // $196B
      'saas': { marketSize: 232000000000, year: 2024 }, // $232B
      'e-commerce': { marketSize: 6300000000000, year: 2024 }, // $6.3T
      'fintech': { marketSize: 310000000000, year: 2024 }, // $310B
      'healthtech': { marketSize: 450000000000, year: 2024 }, // $450B
      'edtech': { marketSize: 400000000000, year: 2024 } // $400B
    };

    const industryLower = industry.toLowerCase();
    for (const [key, data] of Object.entries(industryEstimates)) {
      if (industryLower.includes(key)) {
        return {
          ...data,
          sources: [{
            name: 'Industry Estimate',
            type: 'estimated',
            date: new Date().toISOString()
          }]
        };
      }
    }

    // Default estimate
    return {
      marketSize: 10000000000, // $10B default
      year: 2024,
      sources: [{
        name: 'Market Estimate',
        type: 'estimated',
        date: new Date().toISOString()
      }]
    };
  }

  /**
   * Fetch demographic data
   */
  private async fetchDemographicData(
    targetAudience: string,
    geographicFocus: string
  ): Promise<any> {
    // In production, integrate with:
    // - US Census Bureau
    // - Eurostat
    // - World Bank
    // - Pew Research

    // Estimate target population based on audience type
    const populationEstimates: Record<string, number> = {
      'enterprise': 5000000,
      'small business': 30000000,
      'consumer': 330000000, // US population
      'developer': 27000000, // Global developers
      'startup': 50000000
    };

    const audienceLower = targetAudience.toLowerCase();
    let targetPopulation = 10000000; // Default 10M

    for (const [key, pop] of Object.entries(populationEstimates)) {
      if (audienceLower.includes(key)) {
        targetPopulation = pop;
        break;
      }
    }

    return {
      targetPopulation,
      penetrationRate: 0.1,
      avgAnnualSpend: 100,
      sources: [{
        name: 'Demographic Estimate',
        type: 'estimated',
        date: new Date().toISOString()
      }]
    };
  }

  /**
   * Fetch competitor data
   */
  private async fetchCompetitorData(industry: string): Promise<any> {
    // In production, scrape:
    // - Crunchbase
    // - AngelList
    // - Product Hunt
    // - G2

    // Estimate based on industry
    const competitorCounts: Record<string, number> = {
      'ai': 500,
      'saas': 10000,
      'e-commerce': 100000,
      'fintech': 3000,
      'healthtech': 2000,
      'edtech': 5000
    };

    const industryLower = industry.toLowerCase();
    for (const [key, count] of Object.entries(competitorCounts)) {
      if (industryLower.includes(key)) {
        return { count };
      }
    }

    return { count: 100 }; // Default
  }

  /**
   * Get TAM basis description
   */
  private getTAMBasis(industryData: any, demographicData: any): string {
    if (industryData?.marketSize) {
      return `Based on industry market size of $${this.formatNumber(industryData.marketSize)}`;
    }
    if (demographicData?.targetPopulation) {
      return `Calculated: ${this.formatNumber(demographicData.targetPopulation)} people × penetration rate × average spend`;
    }
    return 'Estimated based on industry benchmarks';
  }

  /**
   * Get SAM basis description
   */
  private getSAMBasis(geographicFocus: string, targetAudience: string): string {
    return `Filtered by ${geographicFocus} geography and ${targetAudience} segment`;
  }

  /**
   * Get SOM basis description
   */
  private getSOMBasis(competitorData: any): string {
    const count = competitorData?.count || 10;
    return `Realistic 2-8% market share based on ${count} competitors in market`;
  }

  /**
   * Generate assumptions list
   */
  private generateAssumptions(
    industry: string,
    targetAudience: string,
    geographicFocus: string
  ): string[] {
    return [
      `Market grows at ${this.estimateGrowthRate(industry)}% annually`,
      `Target penetration rate of 10% in addressable market`,
      `Average customer spends $100-500 annually`,
      `Geographic focus: ${geographicFocus}`,
      `Target segment: ${targetAudience}`,
      'Market share capture of 2-8% is realistic for new entrant'
    ];
  }

  /**
   * Get segment multiplier
   */
  private getSegmentMultiplier(keyword: string): number {
    const multipliers: Record<string, number> = {
      'enterprise': 0.2,
      'b2b': 0.3,
      'small business': 0.4,
      'consumer': 0.8,
      'enterprise only': 0.15
    };
    return multipliers[keyword] || 0.5;
  }

  /**
   * Create default market size
   */
  private createDefaultMarketSize(industry: string): MarketSize {
    return {
      tam: 10000000000,
      sam: 2000000000,
      som: 100000000,
      growthRate: 10,
      confidence: 0.5,
      sources: [{
        name: 'Market Estimate',
        type: 'estimated',
        date: new Date().toISOString()
      }],
      calculations: {
        tamBasis: 'Industry benchmark estimate',
        samBasis: 'Filtered by target segment',
        somBasis: 'Conservative market share assumption',
        assumptions: ['Standard industry growth rate', 'Average market penetration']
      }
    };
  }

  /**
   * Format large numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }
}

// Export singleton instance
export const marketSizer = new MarketSizer();
