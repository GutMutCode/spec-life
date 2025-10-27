# Backend Dockerfile for Task Priority Manager
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy root package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package files
COPY backend/package.json ./backend/

# Copy shared package
COPY shared ./shared/

# Install dependencies (workspace aware)
RUN pnpm install --no-frozen-lockfile

# Copy backend source code and config
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY backend/migrations ./backend/migrations

# Change to backend directory for build
WORKDIR /app/backend

# Build TypeScript
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@9

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy root package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package files
COPY backend/package.json ./backend/

# Copy shared package
COPY shared ./shared/

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/migrations ./backend/migrations

# Change to backend directory
WORKDIR /app/backend

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
