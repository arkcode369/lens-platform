import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'

// Global test timeout
jest.setTimeout(30000)
