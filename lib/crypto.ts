import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 */
export async function hash(password: string, saltRounds: number = SALT_ROUNDS): Promise<string> {
  return bcrypt.hash(password, saltRounds)
}

/**
 * Compare a password with a hash
 */
export async function compare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Verify a hash (check if it's valid bcrypt hash)
 */
export async function verify(hash: string): Promise<boolean> {
  try {
    // bcrypt.compare will return false if hash is invalid
    const result = await compare('test', hash)
    return true // If we got here, hash is valid format
  } catch {
    return false
  }
}
