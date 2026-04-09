/**
 * MVP Scoper Service
 * Prioritizes features and estimates MVP scope using RICE/WSJF frameworks
 */

import axios from 'axios';

export interface MVPFeature {
  id: string;
  name: string;
  description: string;
  priority: number;
  riceScore?: RICEScore;
  wsjfScore?: WSJFScore;
  rationale: string;
  effort: EffortEstimate;
  category: 'core' | 'important' | 'nice-to-have';
}

export interface RICEScore {
  reach: number;      // How many people will this impact?
  impact: number;     // How much will this impact each person? (0.25-3)
  confidence: number; // How confident are we? (0-100%)
  effort: number;     // Person-months
  score: number;      // Final RICE score
}

export interface WSJFScore {
  userBenefit: number;
  timeCriticality: number;
  riskReduction: number;
  opportunityEnablement: number;
  jobSize: number;
  score: number;
}

export interface EffortEstimate {
  personMonths: number;
  personWeeks: number;
  personDays: number;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  teamSize: number;
  timeline: string;
}

export interface BuildVsBuy {
  build: BuildVsBuyItem[];
  buy: BuildVsBuyItem[];
}

export interface BuildVsBuyItem {
  name: string;
  description: string;
  recommendation: 'build' | 'buy' | 'integrate';
  rationale: string;
  estimatedCost: {
    build: number;
    buy: number;
    monthly: number;
  };
  thirdPartyOptions?: string[];
}

export interface Risk {
  type: 'technical' | 'market' | 'competitive' | 'operational' | 'regulatory';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface MVPScope {
  recommendedFeatures: MVPFeature[];
  buildVsBuy: BuildVsBuy;
  totalEffort: EffortEstimate;
  risks: Risk[];
  timeline: {
    phases: MVPPhase[];
    totalMonths: number;
  };
  analyzedAt: Date;
}

export interface MVPPhase {
  name: string;
  description: string;
  features: string[]; // Feature IDs
  duration: number; // weeks
  goals: string[];
}

export class MVPScooper {
  /**
   * Generate MVP scope from product idea and features
   */
  async scope(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedFeatures: string[]
  ): Promise<MVPScope> {
    try {
      // Use LLM for intelligent feature analysis
      if (process.env.LITE_LLM_API_KEY) {
        return await this.scopeWithLLM(idea, targetAudience, problemStatement, proposedFeatures);
      }

      // Fallback to rule-based scoping
      return this.scopeWithRules(idea, targetAudience, problemStatement, proposedFeatures);
    } catch (error) {
      console.error('MVP scoping error:', error);
      return this.scopeWithRules(idea, targetAudience, problemStatement, proposedFeatures);
    }
  }

  /**
   * Scope MVP using LLM
   */
  private async scopeWithLLM(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedFeatures: string[]
  ): Promise<MVPScope> {
    const prompt = `You are an expert product manager and technical architect. Create an MVP scope.

Product Idea: ${idea}
Target Audience: ${targetAudience}
Problem: ${problemStatement}
Proposed Features: ${proposedFeatures.join(', ') || 'None specified'}

Analyze and return ONLY valid JSON:
{
  "recommendedFeatures": [
    {
      "id": "f1",
      "name": "Feature name",
      "description": "What it does",
      "priority": 1,
      "riceScore": {
        "reach": 1000,
        "impact": 2,
        "confidence": 80,
        "effort": 2,
        "score": 1000
      },
      "effort": {
        "personMonths": 2,
        "complexity": "medium",
        "teamSize": 2,
        "timeline": "2 months"
      },
      "rationale": "Why this feature",
      "category": "core"
    }
  ],
  "buildVsBuy": {
    "build": [{
      "name": "Feature",
      "recommendation": "build",
      "rationale": "Why build",
      "estimatedCost": { "build": 50000, "buy": 0, "monthly": 0 }
    }],
    "buy": [{
      "name": "Feature", 
      "recommendation": "buy",
      "rationale": "Why buy",
      "estimatedCost": { "build": 0, "buy": 10000, "monthly": 500 },
      "thirdPartyOptions": ["Option1", "Option2"]
    }]
  },
  "totalEffort": {
    "personMonths": 6,
    "personWeeks": 24,
    "complexity": "medium",
    "teamSize": 3,
    "timeline": "6 months"
  },
  "risks": [{
    "type": "technical",
    "description": "Risk description",
    "probability": "medium",
    "impact": "high",
    "mitigation": "How to mitigate"
  }],
  "timeline": {
    "phases": [{
      "name": "Phase 1",
      "description": "What's included",
      "features": ["f1", "f2"],
      "duration": 8,
      "goals": ["Goal 1", "Goal 2"]
    }],
    "totalMonths": 6
  }
}

Focus on:
1. Core features only for MVP (cut 50% of nice-to-haves)
2. Realistic effort estimates
3. Build vs buy analysis (prefer buying/integrating when possible)
4. Identify key risks and mitigations
5. Phased delivery approach`;

    try {
      const response = await axios.post(
        'https://api.litellm.ai/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert product manager. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.LITE_LLM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );

      const content = response.data.choices[0].message.content;
      const scope = JSON.parse(content);

      return this.normalizeMVPScope(scope);
    } catch (error) {
      console.warn('LLM MVP scoping failed, using rules:', error);
      return this.scopeWithRules(idea, targetAudience, problemStatement, proposedFeatures);
    }
  }

  /**
   * Scope MVP using rules
   */
  private scopeWithRules(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedFeatures: string[]
  ): MVPScope {
    // Extract core features from problem statement
    const coreFeatures = this.extractCoreFeatures(problemStatement, proposedFeatures);
    
    // Calculate RICE scores
    const scoredFeatures = coreFeatures.map((feature, idx) => ({
      ...feature,
      riceScore: this.calculateRICE(feature),
      priority: idx + 1
    }));

    // Sort by RICE score
    scoredFeatures.sort((a, b) => (b.riceScore?.score || 0) - (a.riceScore?.score || 0));

    // Assign categories
    const totalFeatures = scoredFeatures.length;
    for (let i = 0; i < totalFeatures; i++) {
      if (i < totalFeatures * 0.4) {
        scoredFeatures[i].category = 'core';
      } else if (i < totalFeatures * 0.7) {
        scoredFeatures[i].category = 'important';
      } else {
        scoredFeatures[i].category = 'nice-to-have';
      }
    }

    // Build vs Buy analysis
    const buildVsBuy = this.analyzeBuildVsBuy(scoredFeatures);

    // Calculate total effort
    const totalEffort = this.calculateTotalEffort(scoredFeatures);

    // Identify risks
    const risks = this.identifyRisks(idea, targetAudience, scoredFeatures);

    // Create timeline phases
    const phases = this.createPhases(scoredFeatures, totalEffort);

    return {
      recommendedFeatures: scoredFeatures,
      buildVsBuy,
      totalEffort,
      risks,
      timeline: {
        phases,
        totalMonths: totalEffort.personMonths
      },
      analyzedAt: new Date()
    };
  }

  /**
   * Extract core features from problem
   */
  private extractCoreFeatures(
    problemStatement: string,
    proposedFeatures: string[]
  ): MVPFeature[] {
    // If features provided, use them
    if (proposedFeatures.length > 0) {
      return proposedFeatures.slice(0, 15).map((feature, idx) => ({
        id: `f${idx + 1}`,
        name: feature,
        description: `Feature to address ${problemStatement.substring(0, 50)}...`,
        priority: idx + 1,
        effort: this.estimateEffort(feature),
        rationale: 'Addresses core problem',
        category: 'core'
      }));
    }

    // Extract from problem statement
    const featureTemplates = [
      'User authentication and onboarding',
      'Core problem-solving functionality',
      'Dashboard and analytics',
      'Data import/export',
      'Settings and preferences',
      'Mobile-responsive interface',
      'Email notifications',
      'Search and filtering',
      'User profile management',
      'Basic reporting'
    ];

    return featureTemplates.slice(0, 10).map((feature, idx) => ({
      id: `f${idx + 1}`,
      name: feature,
      description: `Feature to address ${problemStatement.substring(0, 50)}...`,
      priority: idx + 1,
      effort: this.estimateEffort(feature),
      rationale: 'Addresses core problem',
      category: 'core'
    }));
  }

  /**
   * Calculate RICE score
   */
  private calculateRICE(feature: MVPFeature): RICEScore {
    // Estimate reach based on feature type
    let reach = 1000;
    if (feature.name.toLowerCase().includes('user') || 
        feature.name.toLowerCase().includes('auth')) {
      reach = 10000;
    } else if (feature.name.toLowerCase().includes('dashboard')) {
      reach = 5000;
    }

    // Impact based on feature category
    const impactMap: Record<string, number> = {
      'core': 3,
      'important': 2,
      'nice-to-have': 1
    };
    const impact = impactMap[feature.category] || 2;

    // Confidence based on clarity
    const confidence = feature.description.length > 50 ? 80 : 60;

    // Effort from estimate
    const effort = feature.effort.personMonths;

    // RICE formula: (Reach × Impact × Confidence) / Effort
    const score = (reach * impact * (confidence / 100)) / effort;

    return { reach, impact, confidence, effort, score: Math.round(score) };
  }

  /**
   * Estimate effort for feature
   */
  private estimateEffort(featureName: string): EffortEstimate {
    const complexityFactors: Record<string, number> = {
      'auth': 3,
      'payment': 4,
      'api': 3,
      'integration': 4,
      'ml': 5,
      'real-time': 4,
      'mobile': 3,
      'dashboard': 2,
      'reporting': 3
    };

    let complexityScore = 2; // Default
    for (const [key, score] of Object.entries(complexityFactors)) {
      if (featureName.toLowerCase().includes(key)) {
        complexityScore = score;
        break;
      }
    }

    const personMonths = complexityScore;
    const personWeeks = personMonths * 4;
    const personDays = personWeeks * 5;

    let complexity: EffortEstimate['complexity'] = 'medium';
    if (complexityScore <= 2) complexity = 'low';
    else if (complexityScore >= 5) complexity = 'very-high';
    else if (complexityScore >= 4) complexity = 'high';

    const teamSize = complexityScore >= 4 ? 3 : 2;

    return {
      personMonths,
      personWeeks,
      personDays,
      complexity,
      teamSize,
      timeline: `${personMonths} month${personMonths > 1 ? 's' : ''}`
    };
  }

  /**
   * Analyze build vs buy
   */
  private analyzeBuildVsBuy(features: MVPFeature[]): BuildVsBuy {
    const build: BuildVsBuyItem[] = [];
    const buy: BuildVsBuyItem[] = [];

    const buyRecommendations: Record<string, { options: string[]; cost: number }> = {
      'authentication': { options: ['Auth0', 'Clerk', 'Supabase Auth'], cost: 50 },
      'payment': { options: ['Stripe', 'Paddle', 'Lemon Squeezy'], cost: 100 },
      'email': { options: ['SendGrid', 'Resend', 'Postmark'], cost: 30 },
      'analytics': { options: ['Mixpanel', 'Amplitude', 'PostHog'], cost: 50 },
      'database': { options: ['Supabase', 'PlanetScale', 'Neon'], cost: 25 },
      'hosting': { options: ['Vercel', 'Netlify', 'Railway'], cost: 20 }
    };

    for (const feature of features) {
      let matched = false;
      for (const [key, recommendation] of Object.entries(buyRecommendations)) {
        if (feature.name.toLowerCase().includes(key)) {
          buy.push({
            name: feature.name,
            description: feature.description,
            recommendation: 'buy',
            rationale: `Use ${recommendation.options[0]} to save development time`,
            estimatedCost: {
              build: feature.effort.personMonths * 20000,
              buy: recommendation.cost * 12,
              monthly: recommendation.cost
            },
            thirdPartyOptions: recommendation.options
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        build.push({
          name: feature.name,
          description: feature.description,
          recommendation: 'build',
          rationale: 'Core differentiator - should build in-house',
          estimatedCost: {
            build: feature.effort.personMonths * 20000,
            buy: 0,
            monthly: 0
          }
        });
      }
    }

    return { build, buy };
  }

  /**
   * Calculate total effort
   */
  private calculateTotalEffort(features: MVPFeature[]): EffortEstimate {
    const totalMonths = features
      .filter(f => f.category === 'core')
      .reduce((sum, f) => sum + f.effort.personMonths, 0);

    const totalWeeks = totalMonths * 4;
    const complexity = totalMonths > 12 ? 'very-high' : totalMonths > 8 ? 'high' : totalMonths > 4 ? 'medium' : 'low';
    const teamSize = totalMonths > 8 ? 4 : totalMonths > 4 ? 3 : 2;

    return {
      personMonths: Math.round(totalMonths),
      personWeeks: Math.round(totalWeeks),
      personDays: Math.round(totalWeeks * 5),
      complexity,
      teamSize,
      timeline: `${totalMonths} months with ${teamSize} person team`
    };
  }

  /**
   * Identify risks
   */
  private identifyRisks(
    idea: string,
    targetAudience: string,
    features: MVPFeature[]
  ): Risk[] {
    const risks: Risk[] = [
      {
        type: 'market',
        description: 'Market may not validate the core value proposition',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Conduct customer interviews before building; launch MVP quickly to test assumptions'
      },
      {
        type: 'technical',
        description: 'Technical complexity may exceed estimates',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Start with simpler architecture; use proven technologies; hire experienced developers'
      },
      {
        type: 'competitive',
        description: 'Competitors may launch similar features',
        probability: 'high',
        impact: 'medium',
        mitigation: 'Focus on unique value proposition; build moats through network effects or data'
      },
      {
        type: 'operational',
        description: 'Team capacity may be insufficient',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Prioritize ruthlessly; consider contractors; focus on core features only'
      }
    ];

    // Add feature-specific risks
    for (const feature of features) {
      if (feature.effort.complexity === 'very-high') {
        risks.push({
          type: 'technical',
          description: `High complexity feature: ${feature.name}`,
          probability: 'high',
          impact: 'medium',
          mitigation: `Break down ${feature.name} into smaller pieces; consider third-party solution`
        });
      }
    }

    return risks.slice(0, 10);
  }

  /**
   * Create delivery phases
   */
  private createPhases(features: MVPFeature[], totalEffort: EffortEstimate): MVPPhase[] {
    const coreFeatures = features.filter(f => f.category === 'core');
    const importantFeatures = features.filter(f => f.category === 'important');

    return [
      {
        name: 'Phase 1: Foundation',
        description: 'Core infrastructure and essential features',
        features: coreFeatures.slice(0, 3).map(f => f.id),
        duration: Math.max(4, Math.floor(totalEffort.personWeeks * 0.3)),
        goals: ['Set up infrastructure', 'Implement core functionality', 'Basic user onboarding']
      },
      {
        name: 'Phase 2: Core Features',
        description: 'Main value proposition delivery',
        features: coreFeatures.slice(3, 7).map(f => f.id),
        duration: Math.max(4, Math.floor(totalEffort.personWeeks * 0.4)),
        goals: ['Deliver primary value', 'User testing', 'Iterate based on feedback']
      },
      {
        name: 'Phase 3: Polish & Launch',
        description: 'Refinement and market launch',
        features: [...coreFeatures.slice(7).map(f => f.id), ...importantFeatures.slice(0, 3).map(f => f.id)],
        duration: Math.max(4, Math.floor(totalEffort.personWeeks * 0.3)),
        goals: ['Bug fixes', 'Performance optimization', 'Launch preparation']
      }
    ];
  }

  /**
   * Normalize LLM MVP scope response
   */
  private normalizeMVPScope(scope: any): MVPScope {
    const normalizedFeatures: MVPFeature[] = (scope.recommendedFeatures || []).map((f: any) => ({
      id: f.id || `f${Math.random().toString(36).substr(2, 9)}`,
      name: f.name || 'Untitled Feature',
      description: f.description || '',
      priority: f.priority || 0,
      riceScore: f.riceScore ? {
        reach: f.riceScore.reach || 1000,
        impact: f.riceScore.impact || 1,
        confidence: f.riceScore.confidence || 50,
        effort: f.riceScore.effort || 1,
        score: f.riceScore.score || 0
      } : undefined,
      effort: f.effort ? {
        personMonths: f.effort.personMonths || 1,
        personWeeks: f.effort.personWeeks || 4,
        personDays: f.effort.personDays || 20,
        complexity: ['low', 'medium', 'high', 'very-high'].includes(f.effort.complexity)
          ? f.effort.complexity
          : 'medium',
        teamSize: f.effort.teamSize || 2,
        timeline: f.effort.timeline || '1 month'
      } : {
        personMonths: 1,
        personWeeks: 4,
        personDays: 20,
        complexity: 'medium',
        teamSize: 2,
        timeline: '1 month'
      },
      rationale: f.rationale || 'Feature needed for MVP',
      category: ['core', 'important', 'nice-to-have'].includes(f.category) ? f.category : 'important'
    }));

    normalizedFeatures.sort((a, b) => a.priority - b.priority);

    return {
      recommendedFeatures: normalizedFeatures,
      buildVsBuy: {
        build: (scope.buildVsBuy?.build || []).map((i: any) => ({
          name: i.name || 'Item',
          description: i.description || '',
          recommendation: ['build', 'buy', 'integrate'].includes(i.recommendation) ? i.recommendation : 'build',
          rationale: i.rationale || '',
          estimatedCost: i.estimatedCost || { build: 0, buy: 0, monthly: 0 }
        })),
        buy: (scope.buildVsBuy?.buy || []).map((i: any) => ({
          name: i.name || 'Item',
          description: i.description || '',
          recommendation: 'buy',
          rationale: i.rationale || '',
          estimatedCost: i.estimatedCost || { build: 0, buy: 0, monthly: 0 },
          thirdPartyOptions: i.thirdPartyOptions || []
        }))
      },
      totalEffort: {
        personMonths: scope.totalEffort?.personMonths || 6,
        personWeeks: scope.totalEffort?.personWeeks || 24,
        personDays: scope.totalEffort?.personDays || 120,
        complexity: ['low', 'medium', 'high', 'very-high'].includes(scope.totalEffort?.complexity)
          ? scope.totalEffort.complexity
          : 'medium',
        teamSize: scope.totalEffort?.teamSize || 3,
        timeline: scope.totalEffort?.timeline || '6 months'
      },
      risks: (scope.risks || []).map((r: any) => ({
        type: ['technical', 'market', 'competitive', 'operational', 'regulatory'].includes(r.type)
          ? r.type
          : 'technical',
        description: r.description || 'Risk',
        probability: ['low', 'medium', 'high'].includes(r.probability) ? r.probability : 'medium',
        impact: ['low', 'medium', 'high'].includes(r.impact) ? r.impact : 'medium',
        mitigation: r.mitigation || 'Monitor and address as needed'
      })),
      timeline: {
        phases: (scope.timeline?.phases || []).map((p: any) => ({
          name: p.name || 'Phase',
          description: p.description || '',
          features: p.features || [],
          duration: p.duration || 8,
          goals: p.goals || []
        })),
        totalMonths: scope.timeline?.totalMonths || 6
      },
      analyzedAt: new Date()
    };
  }
}

// Export singleton instance
export const mvpScooper = new MVPScooper();
