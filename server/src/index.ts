import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import chatRoutes from './routes/chat';
import authRoutes from './routes/auth';
import logsRoutes from './routes/logs';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import feedbackRoutes from './routes/feedback';
import conversationsRoutes from './routes/conversations';
import { db } from './services/Database';
import { createMigrationService } from './services/MigrationService';
import { migrations } from './migrations';
import { StructuredLogger } from './shared/structured-logger';
import {
  requestTracingMiddleware,
  conversationContextMiddleware,
  errorLoggingMiddleware,
} from './shared/request-tracing-middleware';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app: Application = express();

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Trust proxy - REQUIRED when behind AWS ALB/ELB
// This allows Express to read X-Forwarded-* headers
app.set('trust proxy', true);

// Create structured logger
const logger = new StructuredLogger('dani-webchat', NODE_ENV === 'production' ? 'info' : 'debug');

// Add request tracing middleware (MUST be early in middleware chain)
app.use(requestTracingMiddleware({ logger }));
app.use(conversationContextMiddleware());

// Security: Helmet middleware with CSP
// Disable CSP and strict headers when not using HTTPS (for AWS ALB HTTP-only setup)
app.use(
  helmet({
    // Disable CSP entirely when using HTTP to avoid upgrade-insecure-requests
    contentSecurityPolicy: ENABLE_HTTPS ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow inline styles and Google Fonts
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'], // Allow Google Fonts
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false,
    // Only enable HSTS when using HTTPS
    hsts: ENABLE_HTTPS ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
    // Disable headers that require HTTPS when using HTTP
    crossOriginOpenerPolicy: ENABLE_HTTPS ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: ENABLE_HTTPS ? { policy: 'same-origin' } : false,
  })
);

// Compression middleware
app.use(compression());

// Prevent HTTPS upgrade when using HTTP (for AWS ALB without HTTPS)
if (!ENABLE_HTTPS) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Remove any HTTPS upgrade headers
    res.removeHeader('Upgrade-Insecure-Requests');
    next();
  });
}

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip validation errors when behind ALB - we trust the proxy
  validate: false,
});

app.use('/api/', limiter);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static files from React app (must be BEFORE API routes)
if (NODE_ENV === 'production') {
  // Use absolute path to avoid path resolution issues
  const clientBuildPath = '/app/client/build';

  // Check if build directory exists
  if (fs.existsSync(clientBuildPath)) {
    // Serve static files with proper caching and MIME types
    app.use(express.static(clientBuildPath, {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        // Ensure correct MIME types for all static assets
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        }
      },
    }));

    console.log(`📁 Serving static files from: ${clientBuildPath}`);
    console.log(`📁 Files in build directory:`, fs.readdirSync(clientBuildPath));
  } else {
    console.error(`❌ Client build directory not found: ${clientBuildPath}`);
  }
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', chatRoutes);

// 404 handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error logging middleware (logs errors with full context)
app.use(errorLoggingMiddleware());

// Serve React app for all non-API, non-static routes (must be LAST)
if (NODE_ENV === 'production') {
  const clientBuildPath = '/app/client/build';
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Don't serve index.html for static file requests
    // If the request is for a file with an extension in /static/, skip to 404
    if (req.path.startsWith('/static/')) {
      return next();
    }

    const indexPath = path.join(clientBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send(`Server misconfiguration: index.html not found at ${indexPath}`);
    }
  });
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// HTTPS redirect middleware (only when HTTPS is enabled)
const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (ENABLE_HTTPS && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.hostname}:${HTTPS_PORT}${req.url}`);
  }
  next();
};

// Start servers
const startServers = () => {
  // HTTP Server
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 DANI WebChat Server`);
    console.log(`================================`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`HTTP Server: http://localhost:${PORT}`);

    if (ENABLE_HTTPS) {
      console.log(`⚠️  HTTPS enabled - HTTP requests will redirect to HTTPS`);
    }
    console.log(`================================\n`);
  });

  // HTTPS Server (if enabled)
  if (ENABLE_HTTPS) {
    const certPath = process.env.SSL_CERT_PATH || '/app/certs/cert.pem';
    const keyPath = process.env.SSL_KEY_PATH || '/app/certs/key.pem';

    try {
      // Check if certificate files exist
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.error(`\n❌ SSL certificates not found!`);
        console.error(`   Certificate: ${certPath}`);
        console.error(`   Key: ${keyPath}`);
        console.error(`   Please generate certificates using: npm run generate-certs\n`);
        process.exit(1);
      }

      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };

      // Apply HTTPS redirect to HTTP server
      app.use(httpsRedirect);

      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server: https://localhost:${HTTPS_PORT}`);
        console.log(`================================\n`);
      });
    } catch (error) {
      console.error('\n❌ Failed to start HTTPS server:', error);
      console.error('Please check your SSL certificate configuration\n');
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

// Initialize database and start the application
async function initializeApp() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.connect();

    console.log('🔄 Running database migrations...');
    const migrationService = createMigrationService(db);
    // Register all migrations
    migrations.forEach(migration => migrationService.registerMigration(migration));
    await migrationService.runMigrations();

    console.log('🚀 Starting servers...');
    startServers();
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

initializeApp();
