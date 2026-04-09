/**
 * Validation Score Algorithm
 * Combines multiple signals to calculate a 0-100 validation score
 */

import { MarketScanResult } from './market-scanner';
import { SentimentAnalysis } from './sentiment-analyzer';

export interface ValidationScoreBreakdown {
  searchVolume: {
    score: number; // 0-20
    maxScore: number;
    details: string;
  };
  socialMentions: {
    score: number; // 0-30
    maxScore: number;
    details: string;
  };
  sentiment: {
    score: number; // 0-30
    maxScore: number;
    details: string;
  };
  competitorActivity: {
    score: number; // 0-20
    maxScore: number;
    details: string;
  };
}

export interface ValidationScore {
  total: number; // 0-100
  breakdown: ValidationScoreBreakdown;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
  calculatedAt: Date;
}

export class ValidationScoreCalculator {
  /**
   * Calculate validation score from market data
   */
  calculate(
    marketScan: MarketScanResult,
    sentiment: SentimentAnalysis,
    competitorCount: number
  ): ValidationScore {
    const breakdown = this.calculateBreakdown(marketScan, sentiment, competitorCount);
    const total = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);
    const grade = this.calculateGrade(total);
    const recommendation = this.generateRecommendation(total, breakdown, sentiment);

    return {
      total: Math.round(total),
      breakdown,
      grade,
      recommendation,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate individual score components
   */
  private calculateBreakdown(
    marketScan: MarketScanResult,
    sentiment: SentimentAnalysis,
    competitorCount: number
  ): ValidationScoreBreakdown {
    return {
      searchVolume: this.calculateSearchVolumeScore(marketScan),
      socialMentions: this.calculateSocialMentionsScore(marketScan),
      sentiment: this.calculateSentimentScore(sentiment),
      competitorActivity: this.calculateCompetitorScore(competitorCount, marketScan)
    };
  }

  /**
   * Calculate search volume score (0-20 points)
   */
  private calculateSearchVolumeScore(marketScan: MarketScanResult): ValidationScoreBreakdown['searchVolume'] {
    // Find Google Trends signal if available
    const trendsSignal = marketScan.signals.find(s => s.source === 'google-trends');
    const baseVolume = trendsSignal?.mentions || marketScan.totalMentions;

    // Score based on search volume
    let score = 0;
    let details = '';

    if (baseVolume > 10000) {
      score = 20;
      details = 'Very high search volume indicates strong market interest';
    } else if (baseVolume > 5000) {
      score = 16;
      details = 'High search volume shows good market interest';
    } else if (baseVolume > 1000) {
      score = 12;
      details = 'Moderate search volume with decent market interest';
    } else if (baseVolume > 100) {
      score = 8;
      details = 'Low search volume but some market presence';
    } else if (baseVolume > 0) {
      score = 4;
      details = 'Very low search volume, emerging market';
    } else {
      score = 0;
      details = 'No search volume data available';
    }

    // Adjust for trend
    if (marketScan.overallTrend === 'hot') {
      score = Math.min(20, score + 2);
      details += ' and trending upward';
    } else if (marketScan.overallTrend === 'cold') {
      score = Math.max(0, score - 2);
      details += ' but trend is flat or declining';
    }

    return {
      score: Math.round(score),
      maxScore: 20,
      details
    };
  }

  /**
   * Calculate social mentions score (0-30 points)
   */
  private calculateSocialMentionsScore(marketScan: MarketScanResult): ValidationScoreBreakdown['socialMentions'] {
    const totalMentions = marketScan.totalMentions;
    let score = 0;
    let details = '';

    if (totalMentions > 1000) {
      score = 30;
      details = 'Extensive social media presence and discussions';
    } else if (totalMentions > 500) {
      score = 24;
      details = 'Strong social media engagement';
    } else if (totalMentions > 100) {
      score = 18;
      details = 'Good level of social media activity';
    } else if (totalMentions > 50) {
      score = 12;
      details = 'Moderate social media presence';
    } else if (totalMentions > 10) {
      score = 6;
      details = 'Limited but existing social media mentions';
    } else {
      score = 0;
      details = 'Minimal social media presence';
    }

    // Bonus for diversity of sources
    const sourceCount = new Set(marketScan.signals.map(s => s.source)).size;
    if (sourceCount >= 4) {
      score = Math.min(30, score + 3);
      details += ' across multiple platforms';
    } else if (sourceCount >= 2) {
      score = Math.min(30, score + 1);
      details += ' on multiple platforms';
    }

    return {
      score: Math.round(score),
      maxScore: 30,
      details
    };
  }

  /**
   * Calculate sentiment score (0-30 points)
   */
  private calculateSentimentScore(sentiment: SentimentAnalysis): ValidationScoreBreakdown['sentiment'] {
    let score = 0;
    let details = '';

    // Base score from positive sentiment
    score = (sentiment.scores.positive / 100) * 25;

    // Adjust based on overall sentiment
    if (sentiment.overall === 'positive') {
      score += 5;
      details = 'Overwhelmingly positive market sentiment';
    } else if (sentiment.overall === 'neutral') {
      details = 'Neutral sentiment with room for differentiation';
    } else {
      score = Math.max(0, score - 10);
      details = 'Negative sentiment indicates market concerns';
    }

    // Bonus for high confidence
    if (sentiment.confidence > 0.8) {
      score = Math.min(30, score + 2);
      details += ' with high confidence';
    }

    // Consider pain points (more pain points = opportunity)
    if (sentiment.painPoints.length >= 5) {
      score = Math.min(30, score + 3);
      details += ' with clear pain points to address';
    } else if (sentiment.painPoints.length >= 2) {
      score = Math.min(30, score + 1);
      details += ' with some identified pain points';
    }

    return {
      score: Math.round(score),
      maxScore: 30,
      details
    };
  }

  /**
   * Calculate competitor activity score (0-20 points)
   */
  private calculateCompetitorScore(competitorCount: number, marketScan: MarketScanResult): ValidationScoreBreakdown['competitorActivity'] {
    let score = 0;
    let details = '';

    // Validate market existence through competitors
    if (competitorCount >= 10) {
      score = 15;
      details = 'Established market with many competitors';
    } else if (competitorCount >= 5) {
      score = 12;
      details = 'Healthy competition indicates viable market';
    } else if (competitorCount >= 2) {
      score = 8;
      details = 'Few competitors, potential blue ocean';
    } else if (competitorCount === 1) {
      score = 4;
      details = 'Minimal competition, unproven market';
    } else {
      score = 0;
      details = 'No direct competitors found';
    }

    // Bonus for market validation through competitor success
    const competitorSuccess = marketScan.signals.some(s => 
      s.source === 'producthunt' && 
      (s.data?.products?.length || 0) > 0
    );

    if (competitorSuccess) {
      score = Math.min(20, score + 5);
      details += ' with proven product success';
    }

    return {
      score: Math.round(score),
      maxScore: 20,
      details
    };
  }

  /**
   * Calculate letter grade
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Generate recommendation based on score
   */
  private generateRecommendation(
    totalScore: number,
    breakdown: ValidationScoreBreakdown,
    sentiment: SentimentAnalysis
  ): string {
    if (totalScore >= 85) {
      return 'Excellent validation! This idea shows strong market demand. Proceed with confidence and consider fast execution to capture market share.';
    } else if (totalScore >= 70) {
      return 'Strong validation with good market potential. Focus on differentiating from competitors and addressing the key pain points identified.';
    } else if (totalScore >= 55) {
      return 'Moderate validation. Consider refining your value proposition and conducting more customer interviews to strengthen the case.';
    } else if (totalScore >= 40) {
      return 'Weak validation signals. Reconsider your target market or value proposition. Additional market research recommended before proceeding.';
    } else {
      return 'Poor validation scores. Strongly recommend pivoting or conducting extensive customer discovery before investing further.';
    }
  }
}

// Export singleton instance
export const validationScoreCalculator = new ValidationScoreCalculator();
