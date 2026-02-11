/**
 * Security Middleware
 * Implements security headers, rate limiting, CORS, and other security measures
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Configure CORS with whitelist
 */
export function configureCORS(app: Express) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:8080').split(',').map(o => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow all localhost origins
      if (isDevelopment && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600, // 1 hour
    preflightContinue: false,
    optionsSuccessStatus: 200
  }));
}

/**
 * Configure security headers with Helmet
 */
export function configureSecurityHeaders(app: Express) {
  // Build CSP directives conditionally
  const cspDirectives: any = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://accounts.google.com', 'https://login.microsoftonline.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
  };

  // Only add upgradeInsecureRequests in production
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.upgradeInsecureRequests = [];
  }

  // Use helmet with custom configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: process.env.NODE_ENV === 'production',
    },
    noSniff: true,
    xssFilter: true,
    frameguard: {
      action: 'deny',
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }));
}

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/ping';
  },
});

/**
 * Auth/OAuth rate limiter (stricter)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per 15 minutes
  skipSuccessfulRequests: false, // Count successful requests too
  message: 'Too many authentication attempts, please try again later.',
});

/**
 * Login/password attempts rate limiter (very strict)
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login attempts per hour
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again after an hour.',
});

/**
 * Apply security middleware to Express app
 */
export function applySecurityMiddleware(app: Express) {
  // Security headers
  configureSecurityHeaders(app);

  // CORS configuration
  configureCORS(app);

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.header('x-forwarded-proto') !== 'https' && !req.url.includes('health')) {
        res.redirect(301, `https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // Apply rate limiters
  app.use('/api/', apiLimiter);
  app.use('/auth/google/login', authLimiter);
  app.use('/auth/microsoft/login', authLimiter);
  app.use('/auth/callback', loginLimiter);

  // Custom security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Remove powered-by header to avoid revealing tech stack
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'microphone=(), camera=()');

    next();
  });
}

export { apiLimiter, authLimiter, loginLimiter };
