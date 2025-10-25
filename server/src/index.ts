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

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app: Application = express();

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Security: Helmet middleware with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Compression middleware
app.use(compression());

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
});

app.use('/api/', limiter);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', chatRoutes);

// Serve static files from React app (in production)
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuildPath));

  // Serve React app for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

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

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the application
startServers();
