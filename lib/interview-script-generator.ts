/**
 * Interview Script Generator
 * Generates customer interview questions based on product idea
 */

import axios from 'axios';

export interface InterviewQuestion {
  id: string;
  type: 'open-ended' | 'rating-scale' | 'validation' | 'demographic';
  question: string;
  followUp?: string[];
  purpose: string;
  order: number;
}

export interface InterviewScript {
  introduction: string;
  questions: InterviewQuestion[];
  closing: string;
  estimatedDuration: number; // minutes
  targetAudience: string;
  generatedAt: Date;
}

export class InterviewScriptGenerator {
  /**
   * Generate interview script based on product idea
   */
  async generate(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedSolution?: string
  ): Promise<InterviewScript> {
    try {
      // Use LLM for intelligent question generation
      if (process.env.LITE_LLM_API_KEY) {
        return await this.generateWithLLM(idea, targetAudience, problemStatement, proposedSolution);
      }

      // Fallback to template-based generation
      return this.generateWithTemplates(idea, targetAudience, problemStatement, proposedSolution);
    } catch (error) {
      console.error('Interview script generation error:', error);
      return this.generateWithTemplates(idea, targetAudience, problemStatement, proposedSolution);
    }
  }

  /**
   * Generate script using LLM
   */
  private async generateWithLLM(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedSolution?: string
  ): Promise<InterviewScript> {
    const prompt = `You are an expert user research interviewer. Generate a customer discovery interview script.

Product Idea: ${idea}
Target Audience: ${targetAudience}
Problem Statement: ${problemStatement}
Proposed Solution: ${proposedSolution || 'Not specified'}

Generate 12-15 questions that:
1. Start with demographic/context questions
2. Explore the problem deeply (not the solution yet)
3. Understand current solutions and their limitations
4. Gauge interest and willingness to pay
5. End with open feedback

Return ONLY valid JSON in this format:
{
  "introduction": "Friendly 2-3 sentence introduction explaining the interview purpose",
  "questions": [
    {
      "id": "q1",
      "type": "demographic" | "open-ended" | "rating-scale" | "validation",
      "question": "The actual question text",
      "followUp": ["Optional follow-up questions"],
      "purpose": "What we're trying to learn",
      "order": 1
    }
  ],
  "closing": "Friendly closing statement",
  "estimatedDuration": 20
}

Question types:
- demographic: Basic background info
- open-ended: Explore problems and experiences
- rating-scale: 1-10 scale questions
- validation: Test specific assumptions

Make questions neutral (not leading). Focus on past behavior, not future predictions.`;

    try {
      const response = await axios.post(
        'https://api.litellm.ai/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a user research expert. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
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
      const script = JSON.parse(content);

      return this.normalizeScript(script, targetAudience);
    } catch (error) {
      console.warn('LLM script generation failed, using templates:', error);
      return this.generateWithTemplates(idea, targetAudience, problemStatement, proposedSolution);
    }
  }

  /**
   * Generate script using templates
   */
  private generateWithTemplates(
    idea: string,
    targetAudience: string,
    problemStatement: string,
    proposedSolution?: string
  ): InterviewScript {
    const questions: InterviewQuestion[] = [
      {
        id: 'q1',
        type: 'demographic',
        question: `Can you tell me a bit about your role and how you work with ${this.extractDomain(targetAudience)}?`,
        followUp: ['How long have you been in this role?', 'What does a typical day look like?'],
        purpose: 'Understand respondent background and context',
        order: 1
      },
      {
        id: 'q2',
        type: 'open-ended',
        question: 'What is the biggest challenge you face in your work related to this area?',
        followUp: ['How often does this challenge occur?', 'How do you currently handle it?'],
        purpose: 'Identify primary pain points',
        order: 2
      },
      {
        id: 'q3',
        type: 'open-ended',
        question: `Tell me about the last time you encountered the problem: "${problemStatement}"`,
        followUp: ['What was your reaction?', 'What steps did you take to solve it?'],
        purpose: 'Understand recent behavior and problem frequency',
        order: 3
      },
      {
        id: 'q4',
        type: 'open-ended',
        question: 'What solutions have you tried to address this problem?',
        followUp: ['What do you like about these solutions?', 'What frustrates you about them?'],
        purpose: 'Discover current solutions and their limitations',
        order: 4
      },
      {
        id: 'q5',
        type: 'rating-scale',
        question: 'On a scale of 1-10, how painful is this problem for you?',
        followUp: ['What would make it a 10?', 'What would make it a 1?'],
        purpose: 'Quantify problem severity',
        order: 5
      },
      {
        id: 'q6',
        type: 'open-ended',
        question: 'How much time or money do you spend dealing with this problem?',
        followUp: ['Has this increased or decreased over time?', 'Why?'],
        purpose: 'Understand problem impact and cost',
        order: 6
      },
      {
        id: 'q7',
        type: 'open-ended',
        question: 'What would an ideal solution look like for you?',
        followUp: ['What features would be must-haves?', 'What would be nice-to-haves?'],
        purpose: 'Discover desired features and priorities',
        order: 7
      },
      {
        id: 'q8',
        type: 'validation',
        question: `If there was a solution that could ${proposedSolution || 'solve this problem'}, how likely would you be to try it?`,
        followUp: ['What would make you more likely to try it?', 'What would hold you back?'],
        purpose: 'Gauge initial interest',
        order: 8
      },
      {
        id: 'q9',
        type: 'open-ended',
        question: 'Have you ever paid for a solution to this type of problem?',
        followUp: ['How much did you pay?', 'Was it worth it?'],
        purpose: 'Understand willingness to pay',
        order: 9
      },
      {
        id: 'q10',
        type: 'rating-scale',
        question: 'On a scale of 1-10, how important is solving this problem for you right now?',
        followUp: ['Why not lower?', 'Why not higher?'],
        purpose: 'Assess urgency',
        order: 10
      },
      {
        id: 'q11',
        type: 'validation',
        question: 'Would you be interested in being a beta tester for a solution?',
        followUp: ['What would you need to see to feel confident?', 'What concerns do you have?'],
        purpose: 'Test commitment level',
        order: 11
      },
      {
        id: 'q12',
        type: 'open-ended',
        question: 'Is there anything else about this problem or potential solutions you\'d like to share?',
        followUp: [],
        purpose: 'Capture any missed insights',
        order: 12
      }
    ];

    return {
      introduction: `Hi! Thanks for taking the time to chat with me today. I'm exploring challenges around ${this.extractDomain(problemStatement)} and would love to learn from your experience. This will take about 20 minutes, and there are no right or wrong answers - I'm just looking to understand your perspective. Ready to get started?`,
      questions: questions.slice(0, 15),
      closing: 'Thank you so much for your time and insights! This is incredibly helpful. If I have any follow-up questions, would it be okay if I reached out to you? Again, I really appreciate your help.',
      estimatedDuration: 20,
      targetAudience,
      generatedAt: new Date()
    };
  }

  /**
   * Normalize LLM script response
   */
  private normalizeScript(script: any, targetAudience: string): InterviewScript {
    const normalizedQuestions: InterviewQuestion[] = (script.questions || []).map((q: any, idx: number) => ({
      id: q.id || `q${idx + 1}`,
      type: ['open-ended', 'rating-scale', 'validation', 'demographic'].includes(q.type) 
        ? q.type 
        : 'open-ended',
      question: q.question || `Question ${idx + 1}`,
      followUp: Array.isArray(q.followUp) ? q.followUp : [],
      purpose: q.purpose || 'Explore this area',
      order: q.order || idx + 1
    }));

    // Sort by order
    normalizedQuestions.sort((a, b) => a.order - b.order);

    return {
      introduction: script.introduction || `Hi! Thanks for chatting. I'm exploring challenges around ${this.extractDomain(targetAudience)} and would love to learn from your experience.`,
      questions: normalizedQuestions.slice(0, 15),
      closing: script.closing || 'Thank you for your time and insights!',
      estimatedDuration: script.estimatedDuration || 20,
      targetAudience,
      generatedAt: new Date()
    };
  }

  /**
   * Extract domain from text
   */
  private extractDomain(text: string): string {
    // Simple extraction - in production, use NLP
    const words = text.split(/\s+/).filter(w => w.length > 3);
    return words.slice(0, 3).join(' ');
  }
}

// Export singleton instance
export const interviewScriptGenerator = new InterviewScriptGenerator();
