# Deployment Guide

This guide covers deploying the Task Priority Manager to production environments.

## Table of Contents

- [Quick Start with Docker](#quick-start-with-docker)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Web Server Configuration](#web-server-configuration)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Quick Start with Docker

The easiest way to deploy is using Docker Compose.

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Steps

1. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd task-priority-manager

   # Create environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env

   # Edit environment variables (see Environment Configuration)
   vim backend/.env
   vim frontend/.env
   ```

2. **Build and start**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec backend pnpm migrate up
   ```

4. **Access the application**
   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:3001`
   - PostgreSQL: `localhost:5432`

5. **View logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

## Manual Deployment

### System Requirements

**Minimum:**
- 2 CPU cores
- 2 GB RAM
- 10 GB disk space
- Ubuntu 20.04+ or similar Linux distribution

**Recommended:**
- 4 CPU cores
- 4 GB RAM
- 20 GB disk space
- Ubuntu 22.04 LTS

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx

# Install certbot (optional, for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Create Application User

```bash
# Create dedicated user
sudo useradd -r -m -s /bin/bash taskpriority

# Switch to application user
sudo su - taskpriority
```

### 3. Clone and Build

```bash
# Clone repository
git clone <repository-url> ~/task-priority-manager
cd ~/task-priority-manager

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### 4. Configure Environment

Create production environment files:

**backend/.env:**
```bash
DATABASE_URL=postgresql://taskpriority:YOUR_PASSWORD@localhost:5432/task_priority_prod
PORT=3001
NODE_ENV=production
JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

**frontend/.env:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

### 5. Setup Database

```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createuser taskpriority -P
createdb task_priority_prod -O taskpriority

# Exit postgres user
exit

# Run migrations
cd ~/task-priority-manager/backend
pnpm migrate up
```

### 6. Setup systemd Services

**Backend Service** (`/etc/systemd/system/taskpriority-backend.service`):

```ini
[Unit]
Description=Task Priority Manager Backend
After=network.target postgresql.service

[Service]
Type=simple
User=taskpriority
WorkingDirectory=/home/taskpriority/task-priority-manager/backend
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=taskpriority-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable taskpriority-backend
sudo systemctl start taskpriority-backend
sudo systemctl status taskpriority-backend
```

### 7. Serve Frontend with Nginx

Copy frontend build to web root:

```bash
sudo mkdir -p /var/www/taskpriority
sudo cp -r /home/taskpriority/task-priority-manager/frontend/dist/* /var/www/taskpriority/
sudo chown -R www-data:www-data /var/www/taskpriority
```

Configure Nginx (see [Web Server Configuration](#web-server-configuration)).

---

## Environment Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens |
| `CORS_ORIGIN` | No | * | Allowed CORS origins |
| `LOG_LEVEL` | No | info | Logging level (error/warn/info/debug) |

**Example production `.env`:**
```bash
DATABASE_URL=postgresql://user:pass@db-host:5432/dbname
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | http://localhost:3001 | Backend API URL |

**Example production `.env`:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

**Note:** Frontend environment variables are embedded at build time. Rebuild after changing.

### Generating Secrets

```bash
# JWT_SECRET (32 bytes, base64 encoded)
openssl rand -base64 32

# Database password (32 alphanumeric characters)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-32
```

---

## Database Setup

### PostgreSQL Configuration

**1. Create Production Database:**
```bash
sudo -u postgres psql
```

```sql
-- Create user
CREATE USER taskpriority WITH PASSWORD 'your-secure-password';

-- Create database
CREATE DATABASE task_priority_prod OWNER taskpriority;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE task_priority_prod TO taskpriority;

-- Exit
\q
```

**2. Run Migrations:**
```bash
cd backend
pnpm migrate up
```

**3. Verify Schema:**
```bash
sudo -u postgres psql task_priority_prod
```

```sql
\dt  -- List tables
\d tasks  -- Describe tasks table
```

### Connection Pooling

For high-traffic deployments, configure connection pooling:

**Install pgBouncer:**
```bash
sudo apt install pgbouncer
```

**Configure** (`/etc/pgbouncer/pgbouncer.ini`):
```ini
[databases]
task_priority_prod = host=localhost port=5432 dbname=task_priority_prod

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

**Update backend `DATABASE_URL`:**
```bash
DATABASE_URL=postgresql://taskpriority:password@localhost:6432/task_priority_prod
```

### Backup Strategy

**Automated Daily Backups:**

Create backup script (`/home/taskpriority/backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/home/taskpriority/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="task_priority_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U taskpriority task_priority_prod | gzip > $BACKUP_DIR/$FILENAME

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME"
```

**Setup cron job:**
```bash
chmod +x /home/taskpriority/backup.sh
crontab -e

# Add line:
0 2 * * * /home/taskpriority/backup.sh >> /home/taskpriority/backup.log 2>&1
```

---

## Web Server Configuration

### Nginx Configuration

**Create site config** (`/etc/nginx/sites-available/taskpriority`):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (see SSL/TLS Configuration section)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    root /var/www/taskpriority;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/taskpriority /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

**1. Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**2. Obtain Certificate:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**3. Auto-renewal:**
```bash
# Test renewal
sudo certbot renew --dry-run

# Renewal is automatic via systemd timer
sudo systemctl status certbot.timer
```

### Using Custom Certificate

**1. Place certificates:**
```bash
sudo mkdir -p /etc/ssl/private
sudo cp your-cert.crt /etc/ssl/certs/taskpriority.crt
sudo cp your-key.key /etc/ssl/private/taskpriority.key
sudo chmod 600 /etc/ssl/private/taskpriority.key
```

**2. Update Nginx config:**
```nginx
ssl_certificate /etc/ssl/certs/taskpriority.crt;
ssl_certificate_key /etc/ssl/private/taskpriority.key;
```

---

## Monitoring and Logging

### Application Logs

**Backend logs:**
```bash
# systemd journal
sudo journalctl -u taskpriority-backend -f

# Application logs (if configured)
tail -f /var/log/taskpriority/backend.log
```

**Nginx logs:**
```bash
# Access log
tail -f /var/log/nginx/access.log

# Error log
tail -f /var/log/nginx/error.log
```

### Health Checks

**Backend health endpoint:**
```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Monitoring Tools

**Install monitoring stack (optional):**

1. **PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start backend/dist/server.js --name taskpriority-backend
   pm2 startup
   pm2 save
   ```

2. **Prometheus + Grafana** for metrics (advanced)
3. **ELK Stack** for log aggregation (advanced)

---

## Backup and Recovery

### Database Backup

**Manual backup:**
```bash
pg_dump -U taskpriority task_priority_prod | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Restore from backup:**
```bash
gunzip -c backup_20240101.sql.gz | psql -U taskpriority task_priority_prod
```

### Application Backup

**Backup files:**
```bash
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  ~/task-priority-manager \
  /etc/nginx/sites-available/taskpriority \
  /etc/systemd/system/taskpriority-backend.service
```

### Disaster Recovery Plan

1. **Daily automated database backups** (2 AM)
2. **Weekly full system backups**
3. **30-day backup retention**
4. **Off-site backup storage** (S3, rsync to remote server)
5. **Test restore quarterly**

---

## CI/CD Pipeline

### GitHub Actions Example

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run linting
        run: pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install and build
        run: |
          pnpm install
          pnpm build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            frontend/dist
            backend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts

      - name: Deploy to server
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          source: "frontend/dist/*,backend/dist/*"
          target: "/home/taskpriority/deploy"

      - name: Restart services
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            sudo systemctl restart taskpriority-backend
            sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
sudo journalctl -u taskpriority-backend -n 50
```

**Common issues:**
- Database connection failure → Check `DATABASE_URL`
- Port already in use → Change `PORT` in `.env`
- Missing environment variables → Verify `.env` file

### Frontend Not Loading

**Check Nginx:**
```bash
sudo nginx -t
sudo systemctl status nginx
```

**Common issues:**
- Wrong API URL → Rebuild frontend with correct `VITE_API_URL`
- Nginx config errors → Check `/var/log/nginx/error.log`
- File permissions → Ensure `www-data` can read `/var/www/taskpriority`

### Database Connection Issues

**Test connection:**
```bash
psql -U taskpriority -h localhost -d task_priority_prod
```

**Common issues:**
- Wrong password → Check `DATABASE_URL` and `pg_hba.conf`
- PostgreSQL not running → `sudo systemctl start postgresql`
- Firewall blocking → Check `ufw status`

### High Memory Usage

**Check processes:**
```bash
htop
# or
ps aux --sort=-%mem | head
```

**Solutions:**
- Restart backend: `sudo systemctl restart taskpriority-backend`
- Configure PostgreSQL memory settings in `postgresql.conf`
- Enable connection pooling with pgBouncer

### SSL Certificate Expiring

**Check expiration:**
```bash
sudo certbot certificates
```

**Renew manually:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Security Checklist

- [ ] Use strong database passwords
- [ ] Generate unique `JWT_SECRET`
- [ ] Enable firewall (ufw)
- [ ] Configure fail2ban for SSH
- [ ] Use SSL/TLS certificates
- [ ] Set secure headers in Nginx
- [ ] Keep system packages updated
- [ ] Restrict database access to localhost
- [ ] Use non-root user for application
- [ ] Enable automated backups
- [ ] Monitor logs for suspicious activity
- [ ] Implement rate limiting (Nginx)

---

## Performance Optimization

### Database Optimization

**Add indexes:**
```sql
CREATE INDEX idx_tasks_rank ON tasks(rank) WHERE completed_at IS NULL;
CREATE INDEX idx_tasks_completed ON tasks(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_tasks_user ON tasks(user_id, rank);
```

**Vacuum regularly:**
```bash
# Add to cron
0 3 * * 0 vacuumdb -U taskpriority -d task_priority_prod -z
```

### Nginx Caching

Add to Nginx config:
```nginx
# Cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# In location /api/
location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503;
    # ... rest of proxy config
}
```

### Frontend Optimization

**Enable Brotli compression:**
```bash
sudo apt install nginx-module-brotli
```

Add to Nginx:
```nginx
brotli on;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml;
```

---

## Scaling Considerations

### Horizontal Scaling

**Load Balancing:**
- Use Nginx upstream for multiple backend instances
- Share sessions via Redis
- Use read replicas for PostgreSQL

**Example Nginx upstream:**
```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

location /api/ {
    proxy_pass http://backend/;
}
```

### Vertical Scaling

Increase resources:
- CPU: 4+ cores for high traffic
- RAM: 8+ GB for large datasets
- Disk: SSD for database

---

## Support

For deployment issues:
1. Check logs (`journalctl`, Nginx logs)
2. Review this guide
3. Consult [README.md](./README.md) for development setup

**Production Checklist:** Before going live, verify all items in the [Security Checklist](#security-checklist).
