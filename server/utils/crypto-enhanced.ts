/**
 * Enhanced Encryption Utilities with Key Validation
 * Uses Node.js built-in crypto module with AES-256-CBC
 */

import crypto from 'node:crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';

/**
 * Validate that encryption key is properly configured
 * Throws error in production if key is missing or weak
 */
function validateEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY environment variable is required in production. ' +
        'Set it to a 64-character hex string (generated with crypto.randomBytes(32).toString("hex"))'
      );
    } else {
      console.warn(
        '⚠️  ENCRYPTION_KEY not set. Using development default (INSECURE). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
  } else if (key.length !== 64 || !/^[0-9a-f]+$/i.test(key)) {
    console.warn(
      '⚠️  ENCRYPTION_KEY format appears invalid. Should be 64 hex characters. ' +
      'Current length: ' + key.length
    );
  }
}

/**
 * Get encryption key from environment with validation
 * This ensures environment variables are loaded before accessing the key
 */
function getEncryptionKey(): Buffer {
  validateEncryptionKey();

  const keyHex = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-32-chars!!';

  // For AES-256, we need exactly 32 bytes (64 hex characters)
  // If key is already 64 hex chars, use it directly
  // Otherwise, hash it to get consistent 32 bytes
  if (keyHex.length === 64 && /^[0-9a-f]+$/i.test(keyHex)) {
    return Buffer.from(keyHex, 'hex');
  }

  // If not proper hex, create a hash of it to get 32 bytes
  const hash = crypto.createHash('sha256').update(keyHex).digest();
  return hash;
}

/**
 * Generate a valid encryption key (32 bytes for AES-256)
 * Use this to generate new keys for .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt sensitive data
 * @param text Plain text to encrypt
 * @returns Encrypted string with IV prepended (format: iv:encrypted)
 * @throws Error if encryption fails
 */
export function encrypt(text: string): string {
  try {
    if (!text) return '';

    // Get encryption key as Buffer
    const key = getEncryptionKey();

    // Generate random IV (initialization vector) - 16 bytes for AES
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt with PKCS#7 padding (default)
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted text (needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('[CRYPTO] Encryption error:', error instanceof Error ? error.message : error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText Encrypted string with IV prepended (format: iv:encrypted)
 * @returns Decrypted plain text
 * @throws Error if decryption fails or format is invalid
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) return '';

    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.warn('[CRYPTO] Invalid encrypted format - expected iv:encrypted');
      return encryptedText; // Return as-is if format invalid
    }

    const [ivHex, encrypted] = parts;

    // Validate IV hex format
    if (!/^[0-9a-f]{32}$/i.test(ivHex)) {
      console.warn('[CRYPTO] Invalid IV format in encrypted text');
      return encryptedText;
    }

    // Get encryption key
    const key = getEncryptionKey();

    // Convert IV from hex to Buffer
    const iv = Buffer.from(ivHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Don't expose decryption errors to prevent leaking info
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRYPTO] Decryption error:', errorMsg);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt multiple values at once (e.g., OAuth tokens)
 */
export function encryptTokens(tokens: { accessToken: string; refreshToken?: string }): {
  accessToken: string;
  refreshToken?: string;
} {
  return {
    accessToken: encrypt(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
  };
}

/**
 * Decrypt multiple values at once (e.g., OAuth tokens)
 */
export function decryptTokens(encryptedTokens: {
  accessToken: string;
  refreshToken?: string;
}): { accessToken: string; refreshToken?: string } | null {
  try {
    return {
      accessToken: decrypt(encryptedTokens.accessToken),
      refreshToken: encryptedTokens.refreshToken
        ? decrypt(encryptedTokens.refreshToken)
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Test encryption/decryption roundtrip
 * Useful for validating key configuration
 */
export function testEncryption(testData: string = 'test-data-12345'): boolean {
  try {
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    return decrypted === testData;
  } catch {
    return false;
  }
}

export default {
  encrypt,
  decrypt,
  encryptTokens,
  decryptTokens,
  generateEncryptionKey,
  testEncryption,
  getEncryptionKey,
  validateEncryptionKey,
};
