# Frontend Dockerfile for Task Priority Manager
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy root package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy frontend package files
COPY frontend/package.json ./frontend/

# Copy shared package
COPY shared ./shared/

# Install dependencies (workspace aware)
RUN pnpm install --no-frozen-lockfile

# Copy frontend source code and config
COPY frontend ./frontend/

# Change to frontend directory for build
WORKDIR /app/frontend

# Build for production
RUN pnpm build

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
