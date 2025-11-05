import * as crypto from 'crypto';

// Secret key for HMAC signing
// In production, use Firebase Secret Manager or environment variable
// For development, use a secure random key
const SECRET_KEY = process.env.REFERRAL_SECRET_KEY || 'dev-secret-key-CHANGE-IN-PRODUCTION-use-256-bit-random';

/**
 * Generate HMAC signature for referral link
 * Uses SHA-256 for security
 * 
 * @param data - Data to sign (e.g., "referralId:loopType")
 * @returns Hex-encoded HMAC signature
 */
export function generateHMAC(data: string): string {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature (timing-safe comparison)
 * 
 * @param data - Original data that was signed
 * @param signature - Signature to verify
 * @returns true if signature is valid
 */
export function verifyHMAC(data: string, signature: string): boolean {
  try {
    const expected = generateHMAC(data);
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Hash sensitive data (device ID, IP address) for privacy
 * Used for fraud detection without storing PII
 * 
 * @param value - Sensitive value to hash
 * @returns First 16 characters of SHA-256 hash
 */
export function hashSensitive(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16); // First 16 chars for storage efficiency
}

/**
 * Generate a cryptographically secure random string
 * Used for referral IDs
 * 
 * @param length - Length of the random string (default: 8)
 * @returns Random hex string
 */
export function generateSecureRandom(length: number = 8): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

