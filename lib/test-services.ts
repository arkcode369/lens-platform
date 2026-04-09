/**
 * Test script for Phase 2 AI Services
 * Run with: node --loader ts-node/esm lib/test-services.ts
 */

import { marketScanner } from './market-scanner';
import { sentimentAnalyzer } from './sentiment-analyzer';
import { validationScoreCalculator } from './validation-score';
import { competitorDiscoverer } from './competitor-discoverer';
import { interviewScriptGenerator } from './interview-script-generator';
import { marketSizer } from './market-sizer';
import { mvpScooper } from './mvp-scoper';

async function runTests() {
  console.log('🧪 Starting Phase 2 AI Services Tests...\n');

  const testIdea = 'A project management tool for remote teams with AI-powered task prioritization';
  const keywords = ['project management', 'remote teams', 'AI tasks', 'productivity'];

  try {
    // Test 1: Market Scanner
    console.log('✅ Test 1: Market Scanner');
    const marketScan = await marketScanner.scan(testIdea, keywords);
    console.log(`   - Total mentions: ${marketScan.totalMentions}`);
    console.log(`   - Overall trend: ${marketScan.overallTrend}`);
    console.log(`   - Signals from ${marketScan.signals.length} sources\n`);

    // Test 2: Sentiment Analysis
    console.log('✅ Test 2: Sentiment Analyzer');
    const sampleTexts = [
      'I love this tool, it makes my work so much easier!',
      'The pricing is too expensive for small teams.',
      'It\'s okay but could use better integration options.',
      'Best project management tool I\'ve used. Highly recommend!'
    ];
    const sentiment = await sentimentAnalyzer.analyzeBatch(sampleTexts);
    console.log(`   - Overall sentiment: ${sentiment.overall}`);
    console.log(`   - Positive score: ${sentiment.scores.positive}`);
    console.log(`   - Pain points found: ${sentiment.painPoints.length}`);
    console.log(`   - Desires found: ${sentiment.desires.length}\n`);

    // Test 3: Validation Score
    console.log('✅ Test 3: Validation Score Calculator');
    const score = validationScoreCalculator.calculate(marketScan, sentiment, 5);
    console.log(`   - Total score: ${score.total}/100`);
    console.log(`   - Grade: ${score.grade}`);
    console.log(`   - Recommendation: ${score.recommendation}\n`);

    // Test 4: Competitor Discovery
    console.log('✅ Test 4: Competitor Discoverer');
    const competitors = await competitorDiscoverer.discover(testIdea, keywords.slice(0, 2));
    console.log(`   - Found ${competitors.competitors.length} competitors`);
    console.log(`   - Feature matrix has ${competitors.featureMatrix.features.length} features`);
    console.log(`   - Pricing range: $${competitors.pricingAnalysis.minPrice} - $${competitors.pricingAnalysis.maxPrice}\n`);

    // Test 5: Interview Script
    console.log('✅ Test 5: Interview Script Generator');
    const script = await interviewScriptGenerator.generate(
      testIdea,
      'Remote team managers and project coordinators',
      'Remote teams struggle to prioritize tasks effectively and waste time on low-impact work'
    );
    console.log(`   - Generated ${script.questions.length} questions`);
    console.log(`   - Estimated duration: ${script.estimatedDuration} minutes`);
    console.log(`   - Question types: ${[...new Set(script.questions.map(q => q.type))].join(', ')}\n`);

    // Test 6: Market Sizer
    console.log('✅ Test 6: Market Sizer');
    const marketSize = await marketSizer.calculate('Project Management Software', 'Remote teams and enterprises', 'global');
    console.log(`   - TAM: $${marketSize.tam?.toLocaleString()}`);
    console.log(`   - SAM: $${marketSize.sam?.toLocaleString()}`);
    console.log(`   - SOM: $${marketSize.som?.toLocaleString()}`);
    console.log(`   - Growth rate: ${marketSize.growthRate}%`);
    console.log(`   - Confidence: ${(marketSize.confidence * 100).toFixed(0)}%\n`);

    // Test 7: MVP Scoper
    console.log('✅ Test 7: MVP Scoper');
    const mvpScope = await mvpScooper.scope(
      testIdea,
      'Remote team managers',
      'Remote teams struggle to prioritize tasks effectively',
      ['Task management', 'AI prioritization', 'Team dashboard', 'Time tracking', 'Integration hub']
    );
    console.log(`   - Recommended features: ${mvpScope.recommendedFeatures.length}`);
    console.log(`   - Core features: ${mvpScope.recommendedFeatures.filter(f => f.category === 'core').length}`);
    console.log(`   - Total effort: ${mvpScope.totalEffort.timeline}`);
    console.log(`   - Build vs Buy: ${mvpScope.buildVsBuy.build.length} build, ${mvpScope.buildVsBuy.buy.length} buy`);
    console.log(`   - Risks identified: ${mvpScope.risks.length}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Market Scanner: ✅ Working`);
    console.log(`   - Sentiment Analyzer: ✅ Working`);
    console.log(`   - Validation Score: ✅ Working`);
    console.log(`   - Competitor Discoverer: ✅ Working`);
    console.log(`   - Interview Script Generator: ✅ Working`);
    console.log(`   - Market Sizer: ✅ Working`);
    console.log(`   - MVP Scoper: ✅ Working`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
