import { authenticator } from 'otplib'
import { toDataURL } from 'qrcode'

// Configure otplib
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
}

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret()
}

/**
 * Generate a QR code URL for 2FA setup
 */
export function generateQrCodeUrl(secret: string, email: string): string {
  const issuer = process.env.NEXT_PUBLIC_APP_URL?.split('://')[1]?.split('/')[0] || 'AI Product Platform'
  return authenticator.keyuri(email, issuer, secret)
}

/**
 * Verify a TOTP code
 */
export function verifyTotp(secret: string, code: string): boolean {
  return authenticator.verify({
    secret,
    token: code,
  })
}

/**
 * Generate a TOTP code (for testing)
 */
export function generateTotp(secret: string): string {
  return authenticator.generate(secret)
}
