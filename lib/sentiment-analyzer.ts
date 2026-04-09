/**
 * Sentiment Analysis Service
 * Analyzes text for sentiment, pain points, and desires
 */

import axios from 'axios';

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  scores: {
    positive: number; // 0-100
    negative: number; // 0-100
    neutral: number; // 0-100
  };
  painPoints: string[];
  desires: string[];
  keyPhrases: string[];
  confidence: number; // 0-1
}

export interface SentimentResult {
  source: string;
  analyzedAt: Date;
  analysis: SentimentAnalysis;
}

export class SentimentAnalyzer {
  private readonly PAIN_POINT_PATTERNS = [
    /(?:frustrat|annoy|disappoint|hate|tired of|wish|if only|why can't|can't seem to|struggle with|having trouble|difficult to|hard to)/i,
    /(?:problem|issue|challenge|obstacle|barrier|bottleneck)/i,
    /(?:too expensive|costly|pricey|overpriced)/i,
    /(?:complicated|complex|confusing|hard to use|not intuitive)/i,
    /(?:missing|lack of|needs|should have|wish it had)/i,
    /(?:slow|laggy|performance|bug|crash|error)/i
  ];

  private readonly DESIRE_PATTERNS = [
    /(?:want|need|hope|dream|ideal|perfect|would be great|wish for)/i,
    /(?:better|improve|enhance|upgrade|next level)/i,
    /(?:easy|simple|quick|fast|efficient|streamline)/i,
    /(?:affordable|reasonable price|budget-friendly)/i,
    /(?:intuitive|user-friendly|seamless|smooth)/i
  ];

  private readonly POSITIVE_WORDS = [
    'love', 'amazing', 'great', 'excellent', 'fantastic', 'wonderful', 'perfect',
    'awesome', 'incredible', 'outstanding', 'brilliant', 'exceptional', 'superb',
    'helpful', 'useful', 'recommend', 'best', 'favorite', 'impressed', 'happy',
    'satisfied', 'glad', 'pleased', 'thank', 'appreciate', 'easy', 'simple'
  ];

  private readonly NEGATIVE_WORDS = [
    'hate', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'disappointing',
    'frustrating', 'annoying', 'useless', 'waste', 'failed', 'broken', 'buggy',
    'confusing', 'complicated', 'expensive', 'overpriced', 'slow', 'laggy',
    'unreliable', 'poor', 'mediocre', 'disaster', 'regret', 'unhappy'
  ];

  /**
   * Analyze sentiment of text content
   */
  async analyze(text: string): Promise<SentimentAnalysis> {
    if (!text || text.trim().length === 0) {
      return this.createEmptyAnalysis();
    }

    try {
      // Use LLM for advanced sentiment analysis if available
      if (process.env.LITE_LLM_API_KEY) {
        return await this.analyzeWithLLM(text);
      }

      // Fallback to rule-based analysis
      return this.analyzeWithRules(text);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return this.analyzeWithRules(text); // Fallback to rules
    }
  }

  /**
   * Analyze multiple text items and aggregate results
   */
  async analyzeBatch(texts: string[]): Promise<SentimentAnalysis> {
    if (!texts.length) {
      return this.createEmptyAnalysis();
    }

    const analyses = await Promise.all(
      texts.map(text => this.analyze(text))
    );

    return this.aggregateAnalyses(analyses);
  }

  /**
   * Analyze sentiment using LLM
   */
  private async analyzeWithLLM(text: string): Promise<SentimentAnalysis> {
    const prompt = `Analyze the sentiment of this text about a product or service.

Text: "${text.substring(0, 2000)}"

Provide a JSON response with:
{
  "overall": "positive" | "negative" | "neutral",
  "scores": {
    "positive": 0-100,
    "negative": 0-100,
    "neutral": 0-100
  },
  "painPoints": ["list of specific pain points mentioned"],
  "desires": ["list of desires or wishes mentioned"],
  "keyPhrases": ["important phrases or topics"],
  "confidence": 0-1
}

Only return the JSON, no other text.`;

    try {
      const response = await axios.post(
        'https://api.litellm.ai/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sentiment analysis expert. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.LITE_LLM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = response.data.choices[0].message.content;
      const analysis = JSON.parse(content);

      // Validate and normalize the response
      return this.normalizeAnalysis(analysis);
    } catch (error) {
      console.warn('LLM sentiment analysis failed, using rule-based fallback:', error);
      return this.analyzeWithRules(text);
    }
  }

  /**
   * Rule-based sentiment analysis (fallback)
   */
  private analyzeWithRules(text: string): SentimentAnalysis {
    const textLower = text.toLowerCase();
    const words = textLower.split(/\s+/);

    // Calculate word-based sentiment
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (this.POSITIVE_WORDS.some(pw => word.includes(pw))) positiveCount++;
      if (this.NEGATIVE_WORDS.some(nw => word.includes(nw))) negativeCount++;
    }

    const totalSentimentWords = positiveCount + negativeCount;
    const positiveScore = totalSentimentWords > 0 
      ? Math.min(100, (positiveCount / totalSentimentWords) * 100 + (positiveCount * 2))
      : 33;
    const negativeScore = totalSentimentWords > 0 
      ? Math.min(100, (negativeCount / totalSentimentWords) * 100 + (negativeCount * 2))
      : 33;
    const neutralScore = 100 - (positiveScore + negativeScore) / 2;

    // Determine overall sentiment
    let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveScore > negativeScore + 20) overall = 'positive';
    else if (negativeScore > positiveScore + 20) overall = 'negative';

    // Extract pain points
    const painPoints = this.extractPatterns(text, this.PAIN_POINT_PATTERNS);
    
    // Extract desires
    const desires = this.extractPatterns(text, this.DESIRE_PATTERNS);

    // Extract key phrases (nouns and important terms)
    const keyPhrases = this.extractKeyPhrases(text);

    // Calculate confidence based on text length and sentiment clarity
    const confidence = Math.min(1, (text.length / 500) * 0.5 + Math.abs(positiveScore - negativeScore) / 200);

    return {
      overall,
      scores: {
        positive: Math.round(positiveScore),
        negative: Math.round(negativeScore),
        neutral: Math.round(neutralScore)
      },
      painPoints: painPoints.slice(0, 5),
      desires: desires.slice(0, 5),
      keyPhrases: keyPhrases.slice(0, 10),
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Extract patterns matching regex
   */
  private extractPatterns(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        // Get the sentence containing the match
        const sentence = this.extractSentence(text, match.index);
        if (sentence && !matches.includes(sentence)) {
          matches.push(sentence);
        }
      }
    }

    return matches;
  }

  /**
   * Extract sentence containing a position
   */
  private extractSentence(text: string, position: number): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (sentence.indexOf(text[position]) !== -1 || 
          (position >= text.indexOf(sentence) && position < text.indexOf(sentence) + sentence.length)) {
        return sentence.trim().substring(0, 100);
      }
    }
    return text.substring(Math.max(0, position - 50), Math.min(text.length, position + 50)).trim();
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    // Simple noun phrase extraction
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const wordFreq: Record<string, number> = {};
    
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (cleanWord.length > 2) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    }

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Aggregate multiple analyses
   */
  private aggregateAnalyses(analyses: SentimentAnalysis[]): SentimentAnalysis {
    const avgPositive = analyses.reduce((sum, a) => sum + a.scores.positive, 0) / analyses.length;
    const avgNegative = analyses.reduce((sum, a) => sum + a.scores.negative, 0) / analyses.length;
    const avgNeutral = analyses.reduce((sum, a) => sum + a.scores.neutral, 0) / analyses.length;

    let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (avgPositive > avgNegative + 10) overall = 'positive';
    else if (avgNegative > avgPositive + 10) overall = 'negative';

    // Aggregate pain points and desires
    const allPainPoints = analyses.flatMap(a => a.painPoints);
    const allDesires = analyses.flatMap(a => a.desires);
    const allKeyPhrases = analyses.flatMap(a => a.keyPhrases);

    // Remove duplicates and keep top items
    const uniquePainPoints = [...new Set(allPainPoints)].slice(0, 5);
    const uniqueDesires = [...new Set(allDesires)].slice(0, 5);
    const uniqueKeyPhrases = [...new Set(allKeyPhrases)].slice(0, 10);

    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

    return {
      overall,
      scores: {
        positive: Math.round(avgPositive),
        negative: Math.round(avgNegative),
        neutral: Math.round(avgNeutral)
      },
      painPoints: uniquePainPoints,
      desires: uniqueDesires,
      keyPhrases: uniqueKeyPhrases,
      confidence: Math.round(avgConfidence * 100) / 100
    };
  }

  /**
   * Normalize LLM analysis response
   */
  private normalizeAnalysis(analysis: any): SentimentAnalysis {
    return {
      overall: ['positive', 'negative', 'neutral'].includes(analysis.overall) 
        ? analysis.overall 
        : 'neutral',
      scores: {
        positive: Math.max(0, Math.min(100, analysis.scores?.positive || 33)),
        negative: Math.max(0, Math.min(100, analysis.scores?.negative || 33)),
        neutral: Math.max(0, Math.min(100, analysis.scores?.neutral || 34))
      },
      painPoints: Array.isArray(analysis.painPoints) ? analysis.painPoints.slice(0, 5) : [],
      desires: Array.isArray(analysis.desires) ? analysis.desires.slice(0, 5) : [],
      keyPhrases: Array.isArray(analysis.keyPhrases) ? analysis.keyPhrases.slice(0, 10) : [],
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7))
    };
  }

  /**
   * Create empty analysis
   */
  private createEmptyAnalysis(): SentimentAnalysis {
    return {
      overall: 'neutral',
      scores: { positive: 33, negative: 33, neutral: 34 },
      painPoints: [],
      desires: [],
      keyPhrases: [],
      confidence: 0
    };
  }
}

// Export singleton instance
export const sentimentAnalyzer = new SentimentAnalyzer();
