import { describe, it, expect } from '@jest/globals'
import { rateLimit } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const mockRequest = new Request('http://localhost/api/test')
    const result = await rateLimit(mockRequest, '/api/test')
    
    expect(result.success).toBe(true)
    expect(result.remaining).toBeLessThan(100)
  })

  it('should track request count', async () => {
    const mockRequest = new Request('http://localhost/api/test2')
    
    const result1 = await rateLimit(mockRequest, '/api/test2')
    const result2 = await rateLimit(mockRequest, '/api/test2')
    
    expect(result1.remaining).toBeGreaterThan(result2.remaining)
  })
})
