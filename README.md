# DANI WebChat Interface

A modern, production-ready web chat interface for AI agents. Built with TypeScript, React, and Express, with full support for both HTTP (development) and HTTPS (production) deployments.

This web interface can be used as a standalone chat UI for any AI agent that implements a compatible API, or as part of the larger DANI platform (Digi Remote Manager and Network Infrastructure Assistant).

## Features

### 🎨 Modern Chat UI
- Clean, professional interface inspired by ChatGPT and Claude.ai
- Real-time message streaming with typing indicators
- Full markdown support (tables, code blocks, lists, headers, links)
- Syntax highlighting for code blocks
- Message timestamps and status indicators
- Copy-to-clipboard functionality for AI responses
- Token usage and model information display
- Responsive design for desktop and mobile

### 🔐 Security
- **HTTPS support** with SSL/TLS certificates
- **User authentication** with JWT tokens and bcrypt password hashing
- **Session management** with secure cookies
- **Admin approval workflow** for new user signups
- Content Security Policy (CSP) headers
- Rate limiting to prevent abuse (100 req/60s default)
- Input validation and sanitization
- CORS configuration
- **API key management** for users
- **Encryption** for sensitive data (AES-256)

### 👥 User Management
- User registration and login
- Admin panel for user approval and management
- User settings page
- API key generation and management
- Token usage tracking per user
- Conversation history persistence per user

### 💬 User Experience
- Conversation persistence across page refreshes
- Multiple conversations per user
- "New Chat" functionality
- Welcome message with capabilities overview
- User-friendly error handling
- Auto-scroll to latest messages
- Dark/light theme support (via CSS variables)

### 💾 Database
- **PostgreSQL** for persistent data storage
- User accounts with secure password hashing
- Conversation and message history
- Usage tracking for billing/analytics
- Admin user management

### 🛠 Technology Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL 15+
- **Markdown**: react-markdown with GitHub-flavored markdown support
- **Styling**: Custom CSS with CSS variables
- **API Communication**: Axios for HTTP requests
- **Docker**: Multi-stage builds for optimized production images

## Architecture

```
Browser (User)
    ↓
React Frontend (port 3000)
    ↓
Express Backend (port 3000)
    ├─> PostgreSQL Database
    │   ├─> Users
    │   ├─> Conversations
    │   ├─> Messages
    │   ├─> Usage Logs
    │   └─> API Keys
    └─> AI Agent API (configurable endpoint)
```

## Project Structure

```
dani-face/
├── Dockerfile                      # Multi-stage Docker build
├── docker-compose.yml              # Default Docker Compose config
├── docker-compose.dev.yml          # Development config (HTTP)
├── docker-compose.prod.yml         # Production config (HTTPS)
├── package.json                    # Root package.json with scripts
├── tsconfig.json                   # Root TypeScript config
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── README.md                       # This file
├── certs/                          # SSL certificates (gitignored)
│   ├── cert.pem                    # SSL certificate
│   └── key.pem                     # SSL private key
├── scripts/
│   └── generate-certs.sh           # Script to generate self-signed certs
├── db/                             # Database initialization
│   └── init/
│       ├── 01-init-database.sql    # Main schema
│       └── 02-api-keys-table.sql   # API keys table
├── server/                         # Backend Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Main server file
│       ├── types/
│       │   └── agent.types.ts      # Type definitions
│       ├── routes/
│       │   ├── chat.ts             # Chat API routes
│       │   ├── auth.ts             # Authentication routes
│       │   ├── admin.ts            # Admin routes
│       │   ├── logs.ts             # Usage logs routes
│       │   └── settings.ts         # User settings routes
│       ├── middleware/
│       │   └── auth.middleware.ts  # JWT authentication
│       ├── services/
│       │   ├── database.service.ts # Database operations
│       │   ├── auth.service.ts     # Authentication logic
│       │   └── encryption.service.ts # Data encryption
│       └── shared/                 # Shared utilities
│           ├── structured-logger.ts
│           ├── request-tracing-middleware.ts
│           └── secrets-loader.ts
└── client/                         # React frontend
    ├── package.json
    ├── tsconfig.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.tsx               # React entry point
        ├── App.tsx                 # Main App component
        ├── types/
        │   └── message.types.ts    # Frontend type definitions
        ├── services/
        │   └── api.ts              # API client
        ├── context/
        │   ├── AuthContext.tsx     # Authentication context
        │   └── ThemeContext.tsx    # Theme context
        ├── components/
        │   ├── ChatInterface.tsx   # Main chat component
        │   ├── MessageList.tsx     # Message display
        │   ├── MessageInput.tsx    # Message input
        │   ├── WelcomeMessage.tsx  # Welcome screen
        │   ├── Login.tsx           # Login component
        │   ├── Signup.tsx          # Signup component
        │   ├── AdminPanel.tsx      # Admin user management
        │   ├── SettingsPage.tsx    # User settings
        │   └── MarkdownRenderer.tsx # Markdown rendering
        └── styles/                 # CSS files
            ├── index.css
            ├── App.css
            ├── ChatInterface.css
            ├── MessageList.css
            ├── MessageInput.css
            ├── WelcomeMessage.css
            ├── Login.css
            ├── Signup.css
            ├── AdminPanel.css
            ├── SettingsPage.css
            └── MarkdownRenderer.css
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    metadata JSONB,  -- For tool calls, token usage, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Usage Logs Table
```sql
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    model VARCHAR(100),
    input_tokens INTEGER,
    output_tokens INTEGER,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### Admin Table
```sql
CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL 15+ (or use Docker Compose)
- An AI agent service with compatible API (see [Agent Integration](#agent-integration))

### Local Development (HTTP)

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up PostgreSQL database**:

   **Option A: Using Docker Compose (recommended)**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d postgres
   ```

   **Option B: Using existing PostgreSQL**
   ```bash
   psql -U postgres -f db/init/01-init-database.sql
   psql -U postgres -f db/init/02-api-keys-table.sql
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=dani
   DB_USER=dani_db
   DB_PASSWORD=your_db_password

   # Agent API
   AGENT_URL=http://localhost:8080/chat

   # Security (generate strong secrets)
   SESSION_SECRET=your_session_secret_here
   JWT_SECRET=your_jwt_secret_here
   ENCRYPTION_KEY=your_32_byte_encryption_key_here

   # HTTPS (for production)
   ENABLE_HTTPS=false
   ```

4. **Generate secure secrets**:
   ```bash
   # Session secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Encryption key (must be 32 bytes)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Start development servers**:
   ```bash
   # Start both client and server in development mode
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3000`
   - React dev server on `http://localhost:3001` (proxies to backend)

6. **Access the application**:
   - Open `http://localhost:3000` in your browser
   - Register a new account
   - If admin approval is required, approve your account via database or admin panel

### Docker Deployment

#### Development (HTTP)

```bash
# Build and start with development config
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

Access at: `http://localhost:3000`

#### Production (HTTPS)

1. **Generate or obtain SSL certificates**:

   **For testing (self-signed)**:
   ```bash
   npm run generate-certs
   # Or manually:
   bash scripts/generate-certs.sh
   ```

   **For production**: Use Let's Encrypt or commercial certificates (see [SSL Certificate Setup](#ssl-certificate-setup))

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   NODE_ENV=production
   ENABLE_HTTPS=true
   HTTPS_PORT=3443
   SSL_CERT_PATH=/app/certs/cert.pem
   SSL_KEY_PATH=/app/certs/key.pem
   CORS_ORIGIN=https://your-domain.com

   # Use strong secrets in production!
   SESSION_SECRET=<generated-secret>
   JWT_SECRET=<generated-secret>
   ENCRYPTION_KEY=<generated-32-byte-key>
   ```

3. **Place SSL certificates** in the `certs/` directory:
   ```bash
   certs/
   ├── cert.pem    # Your SSL certificate
   └── key.pem     # Your SSL private key
   ```

4. **Start production deployment**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Access the application**:
   - HTTP: `http://your-domain.com:3000` (redirects to HTTPS)
   - HTTPS: `https://your-domain.com:3443`

## SSL Certificate Setup

### Development/Testing (Self-Signed Certificates)

Generate self-signed certificates for testing:

```bash
npm run generate-certs
```

⚠️ **Note**: Browsers will show a security warning for self-signed certificates. This is normal for development.

### Production (Let's Encrypt - Free)

1. **Install Certbot**:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. **Generate certificates**:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. **Copy certificates to project**:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
   sudo chown $USER:$USER certs/*.pem
   ```

4. **Set up auto-renewal**:
   ```bash
   sudo certbot renew --dry-run

   # Add to crontab for automatic renewal
   0 0 * * 0 certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/certs/
   ```

### Production (Cloud Provider Certificates)

- **AWS**: Use AWS Certificate Manager (ACM) with Application Load Balancer
- **Google Cloud**: Use Google-managed SSL certificates with Load Balancer
- **Azure**: Use Azure Key Vault with Application Gateway

### Production (Commercial Certificate Authority)

Purchase certificates from providers like DigiCert, Sectigo, or GoDaddy, and place them in the `certs/` directory as `cert.pem` and `key.pem`.

## Environment Variables

### Complete Reference

```bash
# ============================================
# Server Configuration
# ============================================
NODE_ENV=production                  # development | production
PORT=3000                            # HTTP port
HTTPS_PORT=3443                      # HTTPS port

# ============================================
# SSL/TLS Configuration
# ============================================
ENABLE_HTTPS=false                   # Set to true for production with HTTPS
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem

# ============================================
# Database Configuration
# ============================================
DB_HOST=localhost                    # PostgreSQL host
DB_PORT=5432                         # PostgreSQL port
DB_NAME=dani                         # Database name
DB_USER=dani_db                      # Database user
DB_PASSWORD=your_secure_password     # Database password

# ============================================
# Agent Configuration
# ============================================
AGENT_URL=http://localhost:8080/chat # AI agent API endpoint

# ============================================
# Security Secrets (MUST CHANGE IN PRODUCTION)
# ============================================
SESSION_SECRET=change-me-in-production    # 32+ byte random string
JWT_SECRET=change-me-in-production        # 32+ byte random string
ENCRYPTION_KEY=change-me-in-production    # Exactly 32 bytes (64 hex chars)

# ============================================
# CORS Configuration
# ============================================
CORS_ORIGIN=http://localhost:3000    # Update for production (e.g., https://your-domain.com)

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=60000           # Rate limit window (1 minute)
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window

# ============================================
# AWS Secrets Manager (Optional - Production)
# ============================================
AWS_REGION=us-east-1                 # AWS region for Secrets Manager
# Set any secret to an ARN to load from AWS Secrets Manager:
# DB_PASSWORD=arn:aws:secretsmanager:region:account:secret:name
# JWT_SECRET=arn:aws:secretsmanager:region:account:secret:name
```

### Security Notes

1. **SESSION_SECRET**: Used for session encryption
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **JWT_SECRET**: Used for JWT token signing
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **ENCRYPTION_KEY**: Must be exactly 32 bytes (64 hex characters)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **CORS_ORIGIN**: Set to your actual domain in production (e.g., `https://dani.your-company.com`)

5. **SSL Certificates**: Never commit certificates to version control. The `certs/` directory is gitignored.

## Agent Integration

This web interface can work with any AI agent that implements a compatible API.

### Required Agent API Endpoint

**POST** `/chat` (or custom path configured in `AGENT_URL`)

**Request**:
```json
{
  "message": "User's message here",
  "conversationId": "uuid-v4-id",
  "userId": "optional-user-identifier"
}
```

**Response**:
```json
{
  "response": "Agent's response text (supports markdown)",
  "conversationId": "uuid-v4-id",
  "model": "model-name-used",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cache_creation_tokens": 0,
    "cache_read_tokens": 890
  },
  "iterations": 1
}
```

**Error Response**:
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Example Agent Implementation (Express)

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Your AI agent logic here
    const response = await yourAIAgent.processMessage(message, conversationId);

    res.json({
      response: response.text,
      conversationId: conversationId || generateNewId(),
      model: 'your-model-name',
      usage: {
        input_tokens: response.inputTokens,
        output_tokens: response.outputTokens
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

app.listen(8080, () => {
  console.log('Agent API listening on port 8080');
});
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/signup
Register a new user account.

**Request**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "message": "User registered successfully. Please wait for admin approval.",
  "userId": 123
}
```

#### POST /api/auth/login
Login with username/email and password.

**Request**:
```json
{
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 123,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/logout
Logout current user (clears session).

### Chat Endpoints

#### POST /api/chat
Send a message to the AI agent (requires authentication).

**Request**:
```json
{
  "message": "What devices are offline?",
  "conversationId": "uuid-or-null-for-new"
}
```

**Response**:
```json
{
  "response": "Here are the offline devices...",
  "conversationId": "uuid",
  "model": "claude-sonnet-4-5",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cache_creation_tokens": 0,
    "cache_read_tokens": 890
  },
  "iterations": 3
}
```

#### GET /api/conversations
Get all conversations for current user.

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Device Status Discussion",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T11:30:00Z",
      "message_count": 15
    }
  ]
}
```

#### GET /api/conversations/:id
Get messages for a specific conversation.

**Response**:
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Device Status Discussion",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "What devices are offline?",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Here are the offline devices...",
      "metadata": {
        "model": "claude-sonnet-4-5",
        "tokens": {...}
      },
      "created_at": "2025-01-15T10:00:05Z"
    }
  ]
}
```

### Admin Endpoints

#### GET /api/admin/users
Get all users (admin only).

**Response**:
```json
{
  "users": [
    {
      "id": 123,
      "username": "johndoe",
      "email": "john@example.com",
      "is_active": false,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/admin/users/:id/approve
Approve a pending user (admin only).

**Response**:
```json
{
  "message": "User approved successfully"
}
```

### Health Check

#### GET /api/health
Health check endpoint for load balancers.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "agentConnected": true,
  "database": "connected"
}
```

## Development

### Running Components Separately

**Backend only**:
```bash
cd server
npm install
npm run dev
```

**Frontend only**:
```bash
cd client
npm install
npm run dev
```

**Database only** (Docker):
```bash
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Building for Production

**Build everything**:
```bash
npm run build
```

**Build individually**:
```bash
# Build server
cd server && npm run build

# Build client
cd client && npm run build
```

### Type Checking

TypeScript is configured with strict mode for maximum type safety:

```bash
# Check server types
cd server && npx tsc --noEmit

# Check client types
cd client && npx tsc --noEmit
```

### Database Migrations

When updating the database schema:

1. Create migration SQL file in `db/migrations/`
2. Run migration:
   ```bash
   psql -U dani_db -d dani -f db/migrations/your-migration.sql
   ```

3. Update Docker initialization scripts in `db/init/` if needed

## Troubleshooting

### Issue: "Unable to connect to AI agent"

**Solutions**:
1. Verify the agent is running:
   ```bash
   curl http://localhost:8080/health
   ```

2. Check `AGENT_URL` in `.env` matches agent address

3. Verify network connectivity (if using Docker):
   ```bash
   docker network inspect dani_network
   ```

### Issue: "Database connection failed"

**Solutions**:
1. Verify PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   # or
   sudo systemctl status postgresql
   ```

2. Check database credentials in `.env`

3. Test connection:
   ```bash
   psql -U dani_db -d dani -h localhost -p 5432
   ```

4. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### Issue: "SSL certificate errors"

**Solutions**:
1. For development, accept the self-signed certificate warning in your browser

2. For production, verify certificate files exist:
   ```bash
   ls -la certs/
   ```

3. Check certificate validity:
   ```bash
   openssl x509 -in certs/cert.pem -text -noout
   ```

4. Verify certificate matches domain:
   ```bash
   openssl x509 -in certs/cert.pem -noout -subject
   ```

### Issue: "Port already in use"

**Solutions**:
1. Change ports in `.env` file

2. Stop conflicting services:
   ```bash
   # Find process using port
   lsof -ti:3000

   # Kill process
   lsof -ti:3000 | xargs kill -9
   ```

### Issue: "CORS errors"

**Solutions**:
1. Update `CORS_ORIGIN` in `.env` to match your frontend URL

2. For development with separate servers, ensure React dev server proxies to backend

3. Check browser console for specific CORS error details

### Issue: "User registration pending approval"

**Solutions**:
1. Admin must approve user via admin panel

2. Or manually approve in database:
   ```sql
   UPDATE users SET is_active = true WHERE email = 'user@example.com';
   ```

3. Create admin user:
   ```sql
   -- First get user ID
   SELECT id FROM users WHERE username = 'adminuser';

   -- Add to admin table
   INSERT INTO admin (user_id) VALUES (123);
   ```

## Security Best Practices

### Pre-Deployment Checklist

- [ ] Use HTTPS in production (`ENABLE_HTTPS=true`)
- [ ] Set strong `SESSION_SECRET` (32+ bytes)
- [ ] Set strong `JWT_SECRET` (32+ bytes)
- [ ] Set proper `ENCRYPTION_KEY` (exactly 32 bytes)
- [ ] Configure proper `CORS_ORIGIN` (your actual domain)
- [ ] Use proper SSL certificates (not self-signed)
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Never commit `.env` or certificates to version control
- [ ] Enable rate limiting (already configured)
- [ ] Use CSP headers (already configured)
- [ ] Validate and sanitize all user inputs (already implemented)
- [ ] Use strong database passwords
- [ ] Restrict database access to application only
- [ ] Regular security audits
- [ ] Enable database encryption at rest
- [ ] Implement password complexity requirements
- [ ] Add 2FA support (future enhancement)

### Security Audit Commands

```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated dependencies
npm outdated

# Update dependencies
npm update
```

## Performance Optimization

The application includes several optimizations:

- **Multi-stage Docker builds** for smaller image sizes
- **Compression middleware** for response compression
- **Code splitting** in React (via Create React App)
- **Efficient markdown rendering** with memoization
- **Connection pooling** for database connections
- **Health checks** for container orchestration
- **Lazy loading** of routes and components
- **Caching** of static assets
- **Minification** of JavaScript and CSS in production

## Monitoring and Logging

### Structured Logging

The server uses structured JSON logging with Winston:

```typescript
import { logger } from './shared/structured-logger';

logger.info('User logged in', {
  userId: 123,
  username: 'johndoe',
  ip: req.ip
});
```

### Logs

View application logs:

```bash
# Docker logs
docker-compose logs -f dani-webchat

# Server logs (development)
cd server && npm run dev

# Docker exec into running container
docker exec -it dani-webchat sh
tail -f /app/logs/app.log
```

### Health Checks

The application includes Docker health checks:

```bash
# Check container health
docker inspect dani-webchat | grep -A 10 Health

# Manual health check
curl http://localhost:3000/api/health
```

### Metrics to Monitor

- Request latency (p50, p95, p99)
- Error rate
- Database connection pool usage
- Active user sessions
- Agent API response time
- Memory usage
- CPU usage
- Disk usage

## Production Deployment

### AWS ECS / Fargate

1. Build and push Docker image to ECR
2. Create task definition with environment variables
3. Configure Application Load Balancer for HTTPS
4. Create ECS service with auto-scaling
5. Use RDS for PostgreSQL database
6. Store secrets in AWS Secrets Manager
7. Configure CloudWatch for logs and alarms

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml dani

# Scale service
docker service scale dani_webchat=3
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dani-webchat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dani-webchat
  template:
    metadata:
      labels:
        app: dani-webchat
    spec:
      containers:
      - name: dani-webchat
        image: your-registry/dani-webchat:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: dani-secrets
              key: db-host
```

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Write type-safe code
- Use async/await over callbacks

### Git Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Test thoroughly (local + Docker)
5. Update documentation
6. Create a pull request

### Testing

```bash
# Run all tests (when implemented)
npm test

# Run with coverage
npm run test:coverage

# Test specific component
npm test -- ChatInterface.test.tsx
```

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue in the repository
- Contact the development team
- Check troubleshooting section above

## Acknowledgments

- Built with React and Express
- PostgreSQL for reliable data storage
- TypeScript for type safety
- Docker for containerization
- Inspired by ChatGPT and Claude.ai interfaces

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Status:** Production Ready

**Note**: This is a standalone web chat interface that can be integrated with any AI agent. For integration with the full DANI platform (Digi Remote Manager and Network Infrastructure Assistant), see the main DANI repository.
