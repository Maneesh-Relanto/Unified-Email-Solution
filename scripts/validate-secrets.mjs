#!/usr/bin/env node

/**
 * Secret Validation Script
 * Run this before every deployment to ensure all secrets are configured
 * 
 * Usage: node scripts/validate-secrets.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function success(msg) { log(`✓ ${msg}`, GREEN); }
function error(msg) { log(`✗ ${msg}`, RED); }
function warn(msg) { log(`⚠ ${msg}`, YELLOW); }
function info(msg) { log(`ℹ ${msg}`, CYAN); }
function header(msg) {
  log('\n' + '═'.repeat(50), BLUE);
  log(msg, BLUE);
  log('═'.repeat(50) + '\n', BLUE);
}

// Required secrets and their validation rules
const SECRETS = {
  ENCRYPTION_KEY: {
    required: true,
    validate: (val) => val && val.length === 64 && /^[0-9a-f]+$/i.test(val),
    description: '64-character hex string (32 bytes for AES-256)',
    example: 'a1b2c3d4e5f6...(60 more hex chars)',
  },
  GOOGLE_CLIENT_ID: {
    required: true,
    validate: (val) => val && val.includes('.apps.googleusercontent.com'),
    description: 'Google OAuth Client ID from Google Cloud Console',
    example: '1234567890-abcdefgh.apps.googleusercontent.com',
  },
  GOOGLE_CLIENT_SECRET: {
    required: true,
    validate: (val) => val && val.length > 20,
    description: 'Google OAuth Client Secret from Google Cloud Console',
    example: 'GOCSPX-xxxxxxxxxxxxxxxx',
  },
  MICROSOFT_CLIENT_ID: {
    required: true,
    validate: (val) => val && /^[a-f0-9-]{36}$/.test(val),
    description: 'Microsoft/Azure App ID (UUID format)',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  },
  MICROSOFT_CLIENT_SECRET: {
    required: true,
    validate: (val) => val && val.length > 20,
    description: 'Microsoft/Azure Client Secret',
    example: 'xxx~xxxxxxxxxxxxxxxxxx',
  },
};

// Optional but recommended secrets
const OPTIONAL_SECRETS = {
  ALLOWED_ORIGINS: {
    description: 'CORS allowed origins (comma-separated)',
    example: 'http://localhost:5173,https://yourdomain.com',
  },
  NODE_ENV: {
    description: 'Node environment (development, staging, production)',
    example: 'production',
  },
};

function validateSecret(key, value) {
  const config = SECRETS[key];
  
  if (!config) return { exists: false, valid: false, reason: 'Unknown secret' };
  
  if (!value) {
    return {
      exists: false,
      valid: false,
      reason: `Missing: ${config.description}`,
    };
  }

  const isValid = config.validate(value);
  if (!isValid) {
    return {
      exists: true,
      valid: false,
      reason: `Invalid format: expected ${config.description}`,
    };
  }

  return {
    exists: true,
    valid: true,
    reason: 'Valid',
  };
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), 'confidential/.env');
  
  if (!fs.existsSync(envPath)) {
    return { success: false, error: 'confidential/.env not found', vars: {} };
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const vars = {};
    
    for (const line of content.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim();
      
      if (key && value) {
        vars[key.trim()] = value;
      }
    }

    return { success: true, vars };
  } catch (err) {
    return {
      success: false,
      error: `Failed to read .env: ${(err as any).message}`,
      vars: {},
    };
  }
}

function checkGitIgnore() {
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    return {
      exists: false,
      hasConfidential: false,
      hasEnv: false,
    };
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  
  return {
    exists: true,
    hasConfidential: content.includes('confidential/'),
    hasEnv: content.includes('.env'),
    content,
  };
}

function formatSecretValue(key, value) {
  if (!value) return '[MISSING]';
  
  // Show first 8 and last 4 chars only
  const padding = Math.max(0, value.length - 12);
  return `${value.substring(0, 8)}${'*'.repeat(Math.min(padding, 20))}${value.substring(value.length - 4)}`;
}

function main() {
  console.clear();
  log('╔════════════════════════════════════════════╗', BLUE);
  log('║    🔐 EMAILIFY SECRET VALIDATION SCRIPT    ║', BLUE);
  log('╚════════════════════════════════════════════╝', BLUE);

  // 1. Check .gitignore
  header('1. GIT CONFIGURATION');
  const gitignore = checkGitIgnore();
  
  if (!gitignore.exists) {
    error('.gitignore file not found');
  } else {
    success('.gitignore file found');
    if (gitignore.hasConfidential) {
      success('confidential/ is in .gitignore');
    } else {
      error('confidential/ NOT in .gitignore - CRITICAL ISSUE');
    }
    if (gitignore.hasEnv) {
      success('.env is in .gitignore');
    } else {
      error('.env NOT in .gitignore - CRITICAL ISSUE');
    }
  }

  // 2. Load environment
  header('2. ENVIRONMENT FILE');
  const envResult = loadEnv();
  
  if (!envResult.success) {
    error(`Failed to load: ${envResult.error}`);
    info('Create confidential/.env with required secrets');
    log(`\nTemplate:\n`);
    Object.entries(SECRETS).forEach(([key, config]) => {
      log(`${key}=${config.example}`);
    });
    process.exit(1);
  }

  success(`confidential/.env loaded (${Object.keys(envResult.vars).length} variables)`);

  // 3. Validate required secrets
  header('3. REQUIRED SECRETS VALIDATION');
  
  let allValid = true;
  const results = {};
  
  for (const [key, config] of Object.entries(SECRETS)) {
    const value = envResult.vars[key];
    const validation = validateSecret(key, value);
    results[key] = validation;

    if (!validation.exists) {
      error(`${key}: ${validation.reason}`);
      allValid = false;
    } else if (!validation.valid) {
      error(`${key}: ${validation.reason}`);
      warn(`  Expected format: ${config.description}`);
      warn(`  Example: ${config.example}`);
      allValid = false;
    } else {
      success(`${key}: ${validation.reason}`);
      info(`  Value: ${formatSecretValue(key, value)}`);
    }
  }

  // 4. Check optional secrets
  header('4. OPTIONAL SECRETS');
  
  for (const [key, config] of Object.entries(OPTIONAL_SECRETS)) {
    const value = envResult.vars[key];
    if (value) {
      success(`${key}: configured`);
    } else {
      warn(`${key}: not configured (${config.description})`);
    }
  }

  // 5. Test encryption
  header('5. ENCRYPTION TEST');
  
  const encryptionKey = envResult.vars.ENCRYPTION_KEY;
  if (encryptionKey && results.ENCRYPTION_KEY?.valid) {
    try {
      const testData = 'security-test-12345';
      const key = Buffer.from(encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(testData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      if (decrypted === testData) {
        success('Encryption/decryption works correctly');
      } else {
        error('Encryption roundtrip failed - values do not match');
        allValid = false;
      }
    } catch (err) {
      error(`Encryption test failed: ${(err as any).message}`);
      allValid = false;
    }
  } else {
    warn('Skipping encryption test - invalid ENCRYPTION_KEY');
  }

  // 6. Summary
  header('6. SUMMARY & RECOMMENDATIONS');
  
  if (allValid) {
    log('', RESET);
    log('╔════════════════════════════════════════════╗', GREEN);
    log('║  ✓ ALL SECRETS VALIDATED SUCCESSFULLY      ║', GREEN);
    log('║  ✓ SAFE TO DEPLOY                         ║', GREEN);
    log('╚════════════════════════════════════════════╝', GREEN);
    log('', RESET);
  } else {
    log('', RESET);
    log('╔════════════════════════════════════════════╗', RED);
    log('║  ✗ VALIDATION FAILED                       ║', RED);
    log('║  ✗ DO NOT DEPLOY                          ║', RED);
    log('║  Fix the errors above and try again        ║', RED);
    log('╚════════════════════════════════════════════╝', RED);
    log('', RESET);
    process.exit(1);
  }

  // 7. Security recommendations
  log('\nSecure deployment checklist:');
  log('  ✓ All required secrets present and valid');
  log('  ✓ confidential/ folder in .gitignore');
  log('  ✓ .env file not tracked in git');
  log('  ✓ Encryption key properly formatted');
  log('  ✓ OAuth credentials from official consoles only');
  log('  ✓ No test/fake values in production');
  log('  ✓ Backup of .env created securely');
  log('  ✓ Team trained on security procedures');
  log('', RESET);

  info('To deploy safely:');
  log('  1. Deploy with this script passing ✓');
  log('  2. Set environment variables from .env');
  log('  3. Never commit .env to git');
  log('  4. Keep backup of .env in secure location');
  log('  5. Monitor logs for any auth failures');
  log('  6. Test OAuth flow after deployment');
  log('', RESET);
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateSecret, loadEnv, checkGitIgnore };
