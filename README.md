# DANI WebChat Interface

A modern, production-ready web chat interface for the DANI AI Agent (Digi Remote Manager and Network Infrastructure Assistant). Built with TypeScript, React, and Express, with full support for both HTTP (development) and HTTPS (production) deployments.

## Features

### 🎨 Modern Chat UI
- Clean, professional interface inspired by ChatGPT and Claude.ai
- Real-time message streaming with typing indicators
- Full markdown support (tables, code blocks, lists, headers, links)
- Message timestamps and status indicators
- Copy-to-clipboard functionality for AI responses
- Token usage and model information display
- Responsive design for desktop and mobile

### 🔒 Security
- **HTTPS support** with SSL/TLS certificates
- Content Security Policy (CSP) headers
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Secure session management

### 💬 User Experience
- Conversation persistence across page refreshes
- Session-based conversation IDs
- "New Chat" functionality
- Welcome message with DANI's capabilities
- User-friendly error handling
- Auto-scroll to latest messages

### 🛠 Technology Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Markdown**: react-markdown with GitHub-flavored markdown support
- **Styling**: Custom CSS with CSS variables
- **API Communication**: Axios for HTTP requests
- **Docker**: Multi-stage builds for optimized production images

## Project Structure

```
dani-webchat/
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
├── server/                         # Backend Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Main server file
│       ├── types/
│       │   └── agent.types.ts      # Type definitions
│       └── routes/
│           └── chat.ts             # Chat API routes
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
        ├── components/
        │   ├── ChatInterface.tsx   # Main chat component
        │   ├── MessageList.tsx     # Message display
        │   ├── MessageInput.tsx    # Message input
        │   ├── WelcomeMessage.tsx  # Welcome screen
        │   └── MarkdownRenderer.tsx # Markdown rendering
        └── styles/                 # CSS files
            ├── index.css
            ├── App.css
            ├── ChatInterface.css
            ├── MessageList.css
            ├── MessageInput.css
            ├── WelcomeMessage.css
            └── MarkdownRenderer.css
```

## Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- The DANI agent running on `http://dani-agent:8080/chat`

### Local Development (HTTP)

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Start development servers**:
   ```bash
   # Start both client and server in development mode
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3000`
   - React dev server on `http://localhost:3001` (proxies to backend)

4. **Access the application**:
   - Open `http://localhost:3000` in your browser

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

#### Production (HTTPS)

1. **Generate SSL certificates** (for testing with self-signed certs):
   ```bash
   npm run generate-certs
   # Or manually:
   bash scripts/generate-certs.sh
   ```

   **For production, use proper SSL certificates** from Let's Encrypt or your certificate authority.

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # - ENABLE_HTTPS=true
   # - CORS_ORIGIN=https://your-domain.com
   # - SESSION_SECRET=<strong-random-secret>
   ```

3. **Place your SSL certificates** in the `certs/` directory:
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

### Production (Proper SSL Certificates)

#### Option 1: Let's Encrypt (Free)

1. Install Certbot:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. Generate certificates:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. Copy certificates to project:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
   sudo chown $USER:$USER certs/*.pem
   ```

4. Set up auto-renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

#### Option 2: Cloud Provider Certificates

If using AWS, Google Cloud, or Azure, you can obtain SSL certificates through:
- **AWS**: AWS Certificate Manager (ACM)
- **Google Cloud**: Google-managed SSL certificates
- **Azure**: Azure Key Vault

#### Option 3: Commercial Certificate Authority

Purchase certificates from providers like:
- DigiCert
- Sectigo
- GoDaddy

Place the certificate files in the `certs/` directory as `cert.pem` and `key.pem`.

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=production          # development | production
PORT=3000                    # HTTP port
HTTPS_PORT=3443             # HTTPS port

# SSL/TLS Configuration
ENABLE_HTTPS=false          # Set to true for production with HTTPS
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem

# Agent Configuration
AGENT_URL=http://dani-agent:8080/chat

# Security
CORS_ORIGIN=http://localhost:3000    # Update for production (e.g., https://your-domain.com)
RATE_LIMIT_WINDOW_MS=60000          # Rate limit window (1 minute)
RATE_LIMIT_MAX_REQUESTS=100         # Max requests per window

# Session
SESSION_SECRET=change-me-in-production   # Use a strong random string for production
```

### Important Security Notes

1. **SESSION_SECRET**: Generate a strong random secret for production:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **CORS_ORIGIN**: Set to your actual domain in production (e.g., `https://dani.your-company.com`)

3. **SSL Certificates**: Never commit certificates to version control. The `certs/` directory is gitignored.

## API Documentation

### Chat Endpoint

**Endpoint**: `POST /api/chat`

**Request**:
```json
{
  "message": "What devices are offline?",
  "conversationId": "unique-session-id"
}
```

**Response**:
```json
{
  "response": "Here are the offline devices...",
  "conversationId": "unique-session-id",
  "model": "claude-3-sonnet",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cache_creation_tokens": 0,
    "cache_read_tokens": 8900
  },
  "iterations": 3
}
```

### Health Check Endpoint

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "agentConnected": true
}
```

## Docker Network Configuration

The application is designed to run on the `root_default` Docker network to communicate with the DANI agent.

### Connecting to Existing Network

```yaml
networks:
  root_default:
    external: true
```

Make sure the `dani-agent` service is also on the same network:

```bash
# Check network
docker network inspect root_default

# Connect agent to network (if needed)
docker network connect root_default dani-agent
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

## Troubleshooting

### Issue: "Unable to connect to DANI agent"

**Solutions**:
1. Verify the agent is running:
   ```bash
   docker ps | grep dani-agent
   ```

2. Check network connectivity:
   ```bash
   docker exec dani-webchat ping dani-agent
   ```

3. Verify AGENT_URL in environment variables

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

### Issue: "Port already in use"

**Solutions**:
1. Change ports in `.env` file
2. Stop conflicting services:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

### Issue: "CORS errors"

**Solutions**:
1. Update CORS_ORIGIN in `.env` to match your frontend URL
2. For development with separate servers, the React dev server proxies to the backend

## Security Best Practices

1. ✅ Use HTTPS in production
2. ✅ Set strong SESSION_SECRET
3. ✅ Configure proper CORS_ORIGIN
4. ✅ Keep dependencies updated
5. ✅ Use environment variables for sensitive data
6. ✅ Never commit certificates or secrets to version control
7. ✅ Implement rate limiting (already configured)
8. ✅ Use CSP headers (already configured)
9. ✅ Validate and sanitize user inputs (already implemented)
10. ✅ Regular security audits:
    ```bash
    npm audit
    ```

## Performance Optimization

The application includes several optimizations:

- **Multi-stage Docker builds** for smaller image sizes
- **Compression middleware** for response compression
- **Code splitting** in React (via Create React App)
- **Efficient markdown rendering** with memoization
- **Connection pooling** for API requests
- **Health checks** for container orchestration

## Monitoring and Logging

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
```

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Write type-safe code

### Git Workflow

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Contact the development team

## Roadmap

Potential future enhancements:
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Voice input
- [ ] Export conversation history
- [ ] User authentication
- [ ] Multi-user support with user profiles
- [ ] WebSocket for real-time streaming responses
- [ ] File upload support
- [ ] Integration with monitoring tools (Prometheus, Grafana)

---

**DANI can make mistakes. Please verify important information.**
