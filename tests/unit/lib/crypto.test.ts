import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { hash, compare } from '@/lib/crypto'

describe('Crypto Utilities', () => {
  beforeAll(async () => {
    // Setup if needed
  })

  afterAll(async () => {
    // Cleanup if needed
  })

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hashResult = await hash(password)
      
      expect(hashResult).toBeDefined()
      expect(typeof hashResult).toBe('string')
      expect(hashResult).not.toBe(password)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hash(password)
      const hash2 = await hash(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123'
      const hashResult = await hash(password)
      const isMatch = await compare(password, hashResult)
      
      expect(isMatch).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hashResult = await hash(password)
      const isMatch = await compare(wrongPassword, hashResult)
      
      expect(isMatch).toBe(false)
    })
  })
})
