import 'vitest-fetch-mock';
import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock environment variables for testing
process.env.REDDIT_API_KEY = 'test-reddit-key';
process.env.TWITTER_API_KEY = 'test-twitter-key';
process.env.PRODUCT_HUNT_API_KEY = 'test-producthunt-key';
process.env.LITE_LLM_API_KEY = 'test-llm-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_12345';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test utilities
global.fetch = vi.fn();

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    validation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

// Helper function to create mock data
export function createMockValidation(overrides = {}) {
  return {
    id: 'test-validation-id',
    userId: 'test-user-id',
    idea: 'Test Product Idea',
    targetAudience: 'Small Business Owners',
    industry: 'SaaS',
    geographicFocus: 'United States',
    keywords: ['productivity', 'automation', 'workflow'],
    status: 'completed',
    marketScanResult: null,
    sentimentAnalysis: null,
    validationScore: null,
    competitorDiscovery: null,
    marketSize: null,
    mvpScope: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
