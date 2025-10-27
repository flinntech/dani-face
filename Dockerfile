# Multi-stage build for DANI WebChat

# Stage 1: Build client
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci --legacy-peer-deps

# Copy client source
COPY client/ ./

# Build client
RUN npm run build

# Stage 2: Build server
FROM node:18-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy server source
COPY server/ ./

# Build server
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Switch back to /app as the working directory
WORKDIR /app

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Verify the client build was copied
RUN ls -la /app/client/build && echo "Client build files copied successfully"

# Copy environment file template
COPY .env.example ./.env.example

# Create certs directory for SSL certificates
RUN mkdir -p /app/certs

# Expose ports
EXPOSE 3000 3443

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server/dist/index.js"]
