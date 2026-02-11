#!/usr/bin/env node

/**
 * Security & Environment Setup Helper
 * Run this script to generate secure encryption keys and validate configuration
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function success(message: string) {
  log(`✓ ${message}`, GREEN);
}

function error(message: string) {
  log(`✗ ${message}`, RED);
}

function warn(message: string) {
  log(`⚠ ${message}`, YELLOW);
}

function info(message: string) {
  log(`ℹ ${message}`, CYAN);
}

function header(message: string) {
  console.log('');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, BLUE);
  log(`${message}`, BLUE);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, BLUE);
  console.log('');
}

/**
 * Generate a secure encryption key
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if a string is a valid encryption key
 */
function isValidEncryptionKey(key: string): boolean {
  return key.length === 64 && /^[0-9a-f]+$/i.test(key);
}

/**
 * Check if .env file exists and is configured
 */
function checkEnvFile(): boolean {
  const envPath = path.resolve(process.cwd(), 'confidential/.env');
  return fs.existsSync(envPath);
}

/**
 * Read .env file and check for required keys
 */
function checkRequiredKeys(): { 
  hasEncryptionKey: boolean;
  hasGoogleIds: boolean;
  hasMicrosoftIds: boolean;
  allPresent: boolean;
} {
  try {
    const envPath = path.resolve(process.cwd(), 'confidential/.env');
    if (!fs.existsSync(envPath)) {
      return {
        hasEncryptionKey: false,
        hasGoogleIds: false,
        hasMicrosoftIds: false,
        allPresent: false,
      };
    }

    const content = fs.readFileSync(envPath, 'utf-8');

    return {
      hasEncryptionKey: content.includes('ENCRYPTION_KEY='),
      hasGoogleIds: content.includes('GOOGLE_CLIENT_ID=') && content.includes('GOOGLE_CLIENT_SECRET='),
      hasMicrosoftIds: content.includes('MICROSOFT_CLIENT_ID=') && content.includes('MICROSOFT_CLIENT_SECRET='),
      allPresent: 
        content.includes('ENCRYPTION_KEY=') &&
        content.includes('GOOGLE_CLIENT_ID=') &&
        content.includes('GOOGLE_CLIENT_SECRET=') &&
        content.includes('MICROSOFT_CLIENT_ID=') &&
        content.includes('MICROSOFT_CLIENT_SECRET='),
    };
  } catch (err) {
    return {
      hasEncryptionKey: false,
      hasGoogleIds: false,
      hasMicrosoftIds: false,
      allPresent: false,
    };
  }
}

/**
 * Test encryption roundtrip
 */
function testEncryption(): boolean {
  try {
    // Lazy load crypto functions only when testing
    const testData = 'test-key-validation-12345';
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      return false;
    }

    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted === testData;
  } catch {
    return false;
  }
}

/**
 * Show security recommendations
 */
function showRecommendations() {
  header('🔒 SECURITY RECOMMENDATIONS');

  console.log(YELLOW + 'Before deploying to production:' + RESET);
  console.log('');
  console.log('1. ' + CYAN + 'Git Security' + RESET);
  console.log('   - Ensure .env files are in .gitignore');
  console.log('   - Never commit credentials to Git');
  console.log('   - Check Git history for accidental commits ');
  console.log('   - Command: git log --all --source --remotes -S "ENCRYPTION_KEY" -p');
  console.log('');

  console.log('2. ' + CYAN + 'Environment Variables' + RESET);
  console.log('   - Store in secure secret management (AWS Secrets, Azure Vault, etc)');
  console.log('   - Use different keys for dev/staging/production');
  console.log('   - Rotate keys periodically');
  console.log('');

  console.log('3. ' + CYAN + 'OAuth Credentials' + RESET);
  console.log('   - Verify app URLs match your deployment domain');
  console.log('   - Set restricted API scopes on OAuth apps');
  console.log('   - Regularly audit connected apps in Google/Microsoft consoles');
  console.log('');

  console.log('4. ' + CYAN + 'Network Security' + RESET);
  console.log('   - Use HTTPS only in production');
  console.log('   - Enable HSTS headers');
  console.log('   - Use CSP (Content Security Policy) headers');
  console.log('');

  console.log('5. ' + CYAN + 'Backup & Recovery' + RESET);
  console.log('   - Back up ENCRYPTION_KEY in secure location');
  console.log('   - Document key rotation procedure');
  console.log('   - Test recovery process');
  console.log('');
}

/**
 * Main validation function
 */
async function main() {
  console.clear();
  
  log('╔══════════════════════════════════════════╗', BLUE);
  log('║  🛡️  EMAILIFY SECURITY SETUP VALIDATOR  ║', BLUE);
  log('╚══════════════════════════════════════════╝', BLUE);
  console.log('');
  console.log('This utility helps you verify your security configuration.');
  console.log('');

  // Check 1: .env file existence
  header('Checking Environment Files');
  const envExists = checkEnvFile();
  if (envExists) {
    success('confidential/.env file found');
  } else {
    warn('confidential/.env file not found');
    info('Create it with: touch confidential/.env');
  }

  // Check 2: Required keys
  const keys = checkRequiredKeys();
  console.log('');
  info('Checking for required environment variables:');
  console.log('');

  if (keys.hasEncryptionKey) {
    success('ENCRYPTION_KEY configured');
  } else {
    error('ENCRYPTION_KEY missing');
    console.log(`  Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  }

  if (keys.hasGoogleIds) {
    success('Google OAuth credentials configured');
  } else {
    error('Google OAuth credentials missing');
    console.log('  Get from: https://console.cloud.google.com/apis/credentials');
  }

  if (keys.hasMicrosoftIds) {
    success('Microsoft OAuth credentials configured');
  } else {
    error('Microsoft OAuth credentials missing');
    console.log('  Get from: https://portal.azure.com/');
  }

  console.log('');

  // Check 3: Encryption test
  if (keys.hasEncryptionKey) {
    info('Testing encryption/decryption...');
    const encryptionWorks = testEncryption();
    if (encryptionWorks) {
      success('Encryption test passed ✓');
    } else {
      error('Encryption test failed');
      warn('Check that ENCRYPTION_KEY is 64 hex characters');
    }
    console.log('');
  }

  // Summary
  header('Configuration Summary');
  
  if (keys.allPresent) {
    success('All required credentials are configured!');
    console.log('');
    console.log(GREEN + 'You are ready to start development.' + RESET);
  } else {
    error('Some required credentials are missing.');
    console.log('');
    console.log(YELLOW + 'Next steps:' + RESET);
    if (!keys.hasEncryptionKey) {
      console.log(`  1. Generate encryption key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    }
    if (!keys.hasGoogleIds) {
      console.log('  2. Get Google OAuth credentials from https://console.cloud.google.com');
    }
    if (!keys.hasMicrosoftIds) {
      console.log('  3. Get Microsoft OAuth credentials from https://portal.azure.com');
    }
  }

  console.log('');
  showRecommendations();

  header('Security Checklist');
  const checks = [
    { name: 'Encryption key configured', status: keys.hasEncryptionKey },
    { name: 'Google OAuth credentials', status: keys.hasGoogleIds },
    { name: 'Microsoft OAuth credentials', status: keys.hasMicrosoftIds },
    { name: '.env in .gitignore', status: checkGitignore() },
    { name: 'confidential/ in .gitignore', status: checkGitignorePattern('confidential/') },
  ];

  checks.forEach(check => {
    console.log(`${check.status ? GREEN + '✓' : RED + '✗'} ${RESET} ${check.name}`);
  });

  console.log('');
}

function checkGitignore(): boolean {
  try {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) return false;
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content.includes('.env') || content.includes('confidential/.env');
  } catch {
    return false;
  }
}

function checkGitignorePattern(pattern: string): boolean {
  try {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) return false;
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content.includes(pattern);
  } catch {
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  generateEncryptionKey,
  isValidEncryptionKey,
  checkEnvFile,
  checkRequiredKeys,
  testEncryption,
};
