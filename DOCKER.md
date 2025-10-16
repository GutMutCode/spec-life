# Docker Quick Start Guide

This guide helps you run Task Priority Manager using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Generate secure JWT secret
openssl rand -base64 32

# Edit .env and update values
vim .env
```

**Minimum required changes in `.env`:**
```bash
POSTGRES_PASSWORD=your-secure-password-here
JWT_SECRET=your-generated-jwt-secret-here
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Run Database Migrations

```bash
# Run migrations on backend container
docker-compose exec backend pnpm migrate up
```

### 4. Access the Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

### 5. Stop Services

```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Service Details

### Frontend (Port 80)
- React + TypeScript SPA
- Served by Nginx
- Optimized production build
- Automatic routing for SPA

### Backend (Port 3001)
- Express + TypeScript API
- Connects to PostgreSQL
- Health check endpoint: `/health`

### PostgreSQL (Port 5432)
- PostgreSQL 14
- Data persisted in Docker volume
- Database: `task_priority_dev`
- User: `taskpriority`

---

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild After Code Changes

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# Run migrations
docker-compose exec backend pnpm migrate up

# PostgreSQL shell
docker-compose exec postgres psql -U taskpriority -d task_priority_dev
```

### Database Operations

```bash
# Backup database
docker-compose exec postgres pg_dump -U taskpriority task_priority_dev > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U taskpriority task_priority_dev

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend pnpm migrate up
```

---

## Customization

### Change Ports

Edit `.env` file:

```bash
FRONTEND_PORT=8080
BACKEND_PORT=3001
POSTGRES_PORT=5432
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Production Deployment

For production deployment:

1. **Use strong passwords**:
   ```bash
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Update CORS origin**:
   ```bash
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Set production mode**:
   ```bash
   NODE_ENV=production
   ```

4. **Use reverse proxy** (Nginx/Traefik) for SSL/TLS

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production setup.

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :80
lsof -i :3001
lsof -i :5432

# Change port in .env or stop conflicting service
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready: Wait a few seconds and try again
# - Missing .env file: Copy .env.example to .env
# - Port conflict: Change port in .env
```

### Database Connection Error

```bash
# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in backend container
docker-compose exec backend env | grep DATABASE_URL
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Verify Nginx is running
docker-compose exec frontend nginx -t

# Check if backend is accessible
curl http://localhost:3001/health
```

### Clean Slate Restart

```bash
# Stop everything
docker-compose down -v

# Remove images
docker-compose down --rmi all -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend pnpm migrate up
```

---

## Development with Docker

### Live Development

For development with hot-reload, use local development setup instead:

```bash
# Install dependencies locally
pnpm install

# Run development servers (not Docker)
pnpm dev
```

Docker is recommended for:
- Production deployments
- Testing production builds
- Consistent environments across team

---

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Services should show "healthy" status
```

### Manual Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:80

# Database health
docker-compose exec postgres pg_isready -U taskpriority
```

---

## Resource Usage

**Approximate resource requirements:**

| Service | CPU | Memory | Disk |
|---------|-----|--------|------|
| Frontend | 0.1 cores | 50 MB | 50 MB |
| Backend | 0.5 cores | 256 MB | 100 MB |
| PostgreSQL | 0.5 cores | 256 MB | 1 GB |
| **Total** | **1.1 cores** | **~600 MB** | **~1.2 GB** |

---

## Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Change default passwords** - Update `POSTGRES_PASSWORD` and `JWT_SECRET`
3. **Use HTTPS in production** - Setup reverse proxy with SSL
4. **Limit database access** - Don't expose PostgreSQL port in production
5. **Regular updates** - Keep Docker images up to date

---

## Next Steps

- Read [README.md](./README.md) for project overview
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Check [ACCESSIBILITY.md](./frontend/ACCESSIBILITY.md) for accessibility testing
- Review [PERFORMANCE.md](./frontend/PERFORMANCE.md) for performance optimization

---

## Support

For issues with Docker setup:
1. Check logs: `docker-compose logs`
2. Review troubleshooting section above
3. Consult [DEPLOYMENT.md](./DEPLOYMENT.md)
4. Verify Docker and Docker Compose versions
