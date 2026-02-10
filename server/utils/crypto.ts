/**
 * Encryption utilities for securing sensitive data
 * Uses Node.js built-in crypto module with AES-256-CBC
 */

import crypto from 'node:crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';

/**
 * Get encryption key from environment (lazy-loaded)
 * This ensures environment variables are loaded before accessing the key
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-32-chars!!';
  
  // For AES-256, we need exactly 32 bytes (64 hex characters)
  // If key is already 64 hex chars, use it directly
  // Otherwise, hash it to get consistent 32 bytes
  if (keyHex.length === 64 && /^[0-9a-f]+$/i.test(keyHex)) {
    return Buffer.from(keyHex, 'hex');
  }
  
  // If not proper hex, create a hash of it to get 32 bytes
  const crypto = require('node:crypto');
  const hash = crypto.createHash('sha256').update(keyHex).digest();
  return hash;
}

/**
 * Generate a valid encryption key (32 bytes for AES-256)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt sensitive data
 * @param text Plain text to encrypt
 * @returns Encrypted string with IV prepended
 */
export function encrypt(text: string): string {
  try {
    if (!text) return '';

    // Get encryption key as Buffer
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted text (needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('[CRYPTO] Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText Encrypted string with IV prepended
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) return '';

    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.warn('[CRYPTO] Invalid encrypted format, returning as-is');
      return encryptedText; // Return as-is if not encrypted
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    // Get encryption key as Buffer
    const key = getEncryptionKey();

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[CRYPTO] Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if text is encrypted (has IV prefix format)
 */
export function isEncrypted(text: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]+$/.test(text);
}

/**
 * Safely decrypt if encrypted, otherwise return as-is
 */
export function decryptIfNeeded(text: string): string {
  if (!text) return '';
  return isEncrypted(text) ? decrypt(text) : text;
}
