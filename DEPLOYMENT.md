# Deployment Guide

This guide covers deploying the AI Product Platform to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Stripe Configuration](#stripe-configuration)
6. [SSL Certificate](#ssl-certificate)
7. [Deployment Options](#deployment-options)
8. [Monitoring](#monitoring)
9. [Backup Strategy](#backup-strategy)
10. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

### Required Resources

- **4 VPS instances** (minimum 2 CPU, 4GB RAM each)
  - VPS 1: Load Balancer (Nginx)
  - VPS 2: App Server 1
  - VPS 3: App Server 2
  - VPS 4: Database Server (PostgreSQL + Redis)

- **Domain name** with DNS access
- **SSL certificate** (Let's Encrypt recommended)
- **Git repository** (GitHub/GitLab)
- **CI/CD platform** (GitHub Actions recommended)

### Software Requirements

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- Nginx

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      VPS 1: Load Balancer                    │
│                    - Nginx Reverse Proxy                     │
│                    - SSL Termination                         │
│                    - Rate Limiting                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
┌──────────▼──────────┐        ┌──────────▼──────────┐
│  VPS 2: App Server 1│        │ VPS 3: App Server 2 │
│    - Next.js App    │        │   - Next.js App     │
│    - API Routes     │        │   - API Routes      │
│    - Background Jobs│        │   - Background Jobs │
└──────────┬──────────┘        └──────────┬──────────┘
           │                               │
           └───────────────┬───────────────┘
                           │
                ┌──────────▼──────────┐
                │ VPS 4: Database     │
                │  - PostgreSQL       │
                │  - Redis            │
                │  - Backups          │
                └─────────────────────┘
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-product-platform.git
cd ai-product-platform
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_product_platform

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_INDIVIDUAL=price_xxx
STRIPE_PRICE_ID_TEAM=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx

# External APIs
REDDIT_API_KEY=your-reddit-key
TWITTER_API_KEY=your-twitter-key
PRODUCT_HUNT_API_KEY=your-producthunt-key
LITE_LLM_API_KEY=your-litellm-key

# Market Data
MARKET_DATA_API_KEY=your-market-data-key
GOOGLE_SEARCH_API_KEY=your-google-search-key
GOOGLE_CSE_ID=your-google-cse-id
```

### 3. Copy Example Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

---

## Database Setup

### Option 1: Docker (Recommended for Development)

```bash
docker-compose up -d postgres redis
```

### Option 2: Production PostgreSQL

```bash
# Install PostgreSQL
apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE ai_product_platform;
CREATE USER app_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE ai_product_platform TO app_user;
\q

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://app_user:password@localhost:5432/ai_product_platform
```

### Run Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Stripe Configuration

### 1. Create Stripe Account

- Sign up at [stripe.com](https://stripe.com)
- Switch to **Live Mode** for production

### 2. Create Products & Prices

```bash
# Using Stripe CLI
stripe prices create \
  --unit-amount 4900 \
  --currency usd \
  --recurring interval=month \
  --product-data[name="Individual Plan"]

stripe prices create \
  --unit-amount 29900 \
  --currency usd \
  --recurring interval=month \
  --product-data[name="Team Plan"]

stripe prices create \
  --unit-amount 99900 \
  --currency usd \
  --recurring interval=month \
  --product-data[name="Enterprise Plan"]
```

### 3. Configure Webhooks

```bash
# Install Stripe CLI
stripe listen --forward-to https://yourdomain.com/api/billing/webhook

# Or configure in Stripe Dashboard:
# Settings > Developers > Webhooks > Add endpoint
# Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

### 4. Update Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_INDIVIDUAL=price_xxx
STRIPE_PRICE_ID_TEAM=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx
```

---

## SSL Certificate

### Let's Encrypt (Certbot)

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
certbot renew --dry-run
```

### Certificate Location

```
/etc/letsencrypt/live/yourdomain.com/
├── fullchain.pem
└── privkey.pem
```

Update `nginx.conf` to point to these certificates.

---

## Deployment Options

### Option 1: Docker Compose (Single Server)

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Option 2: Multiple VPS Deployment

#### VPS 1: Load Balancer

```bash
# Install Nginx
apt-get install nginx

# Copy nginx.conf
cp nginx.conf /etc/nginx/nginx.conf

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

#### VPS 2 & 3: App Servers

```bash
# Clone and install
git clone https://github.com/your-org/ai-product-platform.git
cd ai-product-platform
npm ci --production
npm run build

# Start with PM2
pm2 start npm --name "ai-product-platform" -- start
pm2 save
pm2 startup

# Or use Docker
docker-compose -f docker-compose.prod.yml up -d app
```

#### VPS 4: Database Server

```bash
# Install PostgreSQL
apt-get install postgresql postgresql-contrib

# Configure PostgreSQL
# Edit /etc/postgresql/16/main/postgresql.conf
listen_addresses = '*'
max_connections = 200

# Configure replication (optional for high availability)
```

### Option 3: GitHub Actions Auto-Deploy

Push to `main` branch triggers:
1. Run tests
2. Build application
3. Deploy to VPS via SSH

See `.github/workflows/ci.yml` for configuration.

---

## Monitoring

### Application Monitoring

```bash
# Install PM2 with monitoring
npm install -g pm2
pm2 install pm2-logrotate
pm2 install pm2-metrics
```

### Health Check Endpoint

```bash
# Check application health
curl https://yourdomain.com/api/health

# Check database connection
curl https://yourdomain.com/api/health?check=database

# Check Redis connection
curl https://yourdomain.com/api/health?check=redis
```

### Log Aggregation

```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f app

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Uptime Monitoring

- **UptimeRobot**: Free tier available
- **Pingdom**: Paid, more features
- **StatusCake**: Free tier available

Configure alerts for:
- HTTP 5xx errors
- Response time > 2s
- SSL certificate expiration

---

## Backup Strategy

### Database Backups

```bash
# Run backup script
./scripts/backup.sh 30  # Keep 30 days of backups

# Schedule with cron
0 2 * * * /path/to/backup.sh 30 >> /var/log/backup.log 2>&1
```

### Backup Retention

- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months

### Backup Storage

- **Local**: `/backups/postgres`
- **Remote**: AWS S3, Google Cloud Storage, or similar
- **Offsite**: Different geographic location

### Restore Procedure

```bash
# Find latest backup
ls -lt /backups/postgres/ai_product_platform_*.sql.gz | head -1

# Restore
gunzip -c /backups/postgres/ai_product_platform_20240101_000000.sql.gz | \
  psql -U postgres -d ai_product_platform
```

---

## Rollback Procedure

### Quick Rollback (Last Deployment)

```bash
# If using PM2
pm2 reload all --update-env

# If using Docker
docker-compose -f docker-compose.prod.yml down
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d --build

# If using GitHub Actions deployment
# Re-run previous successful workflow from GitHub Actions tab
```

### Database Rollback

```bash
# Revert last migration
npx prisma migrate revert

# Or restore from backup
./scripts/restore.sh <backup-file>
```

### Full Rollback Checklist

1. [ ] Stop application
2. [ ] Revert code to previous version
3. [ ] Revert database migrations if needed
4. [ ] Restart application
5. [ ] Verify health check passes
6. [ ] Monitor logs for errors
7. [ ] Notify stakeholders

---

## Troubleshooting

### Common Issues

#### Application won't start

```bash
# Check logs
pm2 logs ai-product-platform
docker-compose logs app

# Check environment variables
env | grep NEXT_

# Verify build
npm run build
```

#### Database connection errors

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection
psql -U postgres -d ai_product_platform

# Verify credentials in .env
```

#### High memory usage

```bash
# Check memory
free -h
pm2 monit

# Restart application
pm2 restart all

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### SSL certificate issues

```bash
# Check certificate
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Renew certificate
certbot renew

# Test renewal
certbot renew --dry-run
```

---

## Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (UFW/iptables)
- [ ] Database not exposed to public internet
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
- [ ] Webhook signatures verified
- [ ] API keys rotated regularly

---

## Performance Optimization

### Database

- Enable query logging
- Set up connection pooling (PgBouncer)
- Configure appropriate `max_connections`
- Regular VACUUM and ANALYZE

### Redis

- Enable persistence (AOF)
- Set appropriate maxmemory
- Configure eviction policy

### Application

- Enable Next.js output tracing
- Use CDN for static assets
- Enable gzip compression
- Implement caching strategies

### Nginx

- Enable keepalive connections
- Configure proper timeouts
- Set up caching for static files
- Enable HTTP/2

---

## Support & Resources

- **Documentation**: [Link to docs]
- **GitHub Issues**: [Link to repo]
- **Status Page**: [Link to status]
- **Emergency Contact**: [Contact info]

---

*Last updated: 2024-01-01*
