# Lens Platform - Docker Deployment Guide

## 🐳 Quick Start (Single Command)

```bash
# Clone and deploy
git clone https://github.com/your-repo/lens-platform.git
cd lens-platform

# Setup environment
cp .dockerenv.example .env
nano .env  # Fill in your values

# Start everything
docker-compose up -d --build

# Wait for services to be ready
docker-compose ps

# Check logs
docker-compose logs -f
```

---

## 📋 Prerequisites

Install Docker on AWS VPS:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version

# Logout and login again for group changes to take effect
```

---

## 🔧 Configuration

### 1. Setup Environment Variables

```bash
cp .dockerenv.example .env
nano .env
```

**Fill in:**

```bash
# Database (change this!)
POSTGRES_PASSWORD=your_super_secure_password_here_123!

# Auth (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-32-character-random-secret-key-here
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI APIs (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Generate Secrets

```bash
# Generate auth secret
openssl rand -base64 32

# Generate postgres password (optional)
openssl rand -base64 32
```

---

## 🚀 Deployment Steps

### Step 1: Build & Start

```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

**Expected output:**
```
NAME              STATUS
lens-app          Up (healthy)
lens-postgres     Up (healthy)
lens-redis        Up (healthy)
lens-nginx        Up
```

### Step 2: Run Database Migrations

```bash
# Enter app container
docker-compose exec app sh

# Run migrations
npx prisma migrate deploy
npx prisma db push

# Exit container
exit
```

### Step 3: Access Application

```bash
# Check logs
docker-compose logs -f app

# Access via localhost
curl http://localhost:3000

# Or via nginx
curl http://localhost
```

---

## 🌐 Domain & SSL Setup

### Option A: With Nginx Proxy Manager (Recommended)

```bash
# Install Nginx Proxy Manager
docker run -d \
  --name=nginx-proxy-manager \
  --restart=unless-stopped \
  -p 80:80 \
  -p 81:81 \
  -p 443:443 \
  -v ./npm-data:/data \
  -v ./npm-letsencrypt:/letsencrypt \
  jc21/nginx-proxy-manager:latest

# Access at http://your-server-ip:81
# Default: admin@example.com / changeme
```

Then:
1. Add proxy host: `app.lens.com` → `lens-app:3000`
2. Request SSL certificate
3. Done!

### Option B: Manual Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx.conf with SSL config
# (uncomment SSL section in nginx.conf)

# Restart nginx
docker-compose restart nginx
```

---

## 📊 Management Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 app
```

### Shell Access

```bash
# Enter app container
docker-compose exec app sh

# Enter postgres container
docker-compose exec postgres psql -U lens_user -d lens_platform

# Enter nginx container
docker-compose exec nginx sh
```

### Database Operations

```bash
# Open Prisma Studio
docker-compose exec app npx prisma studio

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Reset database (WARNING: deletes all data!)
docker-compose down -v
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

---

## 🔒 Security Best Practices

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Docker Security

```bash
# Run as non-root user (already configured in Dockerfile)
# Use specific image versions (not :latest in production)
# Enable Docker content trust
export DOCKER_CONTENT_TRUST=1
```

### 3. Environment Variables

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Use Docker secrets for sensitive data
# (advanced: see Docker Swarm secrets)
```

---

## 🔄 Updates

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations if needed
docker-compose exec app npx prisma migrate deploy
```

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with new base images
docker-compose build --no-cache

# Restart
docker-compose up -d
```

---

## 🐛 Troubleshooting

### App won't start

```bash
# Check logs
docker-compose logs app

# Check if database is ready
docker-compose exec postgres pg_isready -U lens_user

# Check environment variables
docker-compose exec app env | grep BETTER_AUTH
```

### Database connection errors

```bash
# Check database is running
docker-compose ps postgres

# Check connection string
docker-compose exec app printenv DATABASE_URL

# Test connection
docker-compose exec app psql $DATABASE_URL
```

### Port already in use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process or change port in docker-compose.yml
```

### Out of memory

```bash
# Check memory usage
docker stats

# Increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📈 Monitoring

### Health Checks

```bash
# Check container health
docker-compose ps

# Check health endpoint
curl http://localhost:3000/api/health

# Check database health
docker-compose exec postgres pg_isready
```

### Logs Analysis

```bash
# Real-time logs
docker-compose logs -f --tail=100

# Error logs only
docker-compose logs app | grep -i error

# Access logs (nginx)
docker-compose logs nginx | grep "200\|404\|500"
```

---

## 💾 Backup & Restore

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U lens_user lens_platform > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_*.sql

# Download
docker cp lens-postgres:/var/lib/postgresql/data/backup.sql ./backup.sql
```

### Restore Database

```bash
# Upload backup
docker cp backup.sql lens-postgres:/tmp/backup.sql

# Restore
docker-compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres psql -U lens_user -d lens_platform -f /tmp/backup.sql
```

### Backup Docker Volumes

```bash
# Backup postgres volume
docker run --rm -v lens-platform_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore
docker run --rm -v lens-platform_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 🎯 Production Checklist

- [ ] Change all default passwords
- [ ] Setup SSL certificate
- [ ] Configure firewall
- [ ] Setup monitoring (optional: Prometheus/Grafana)
- [ ] Setup backup schedule (cron job)
- [ ] Configure Stripe webhooks
- [ ] Test all features
- [ ] Setup error tracking (optional: Sentry)
- [ ] Document runbook
- [ ] Setup alerts (optional: UptimeRobot)

---

## 📞 Support

- **Logs:** `docker-compose logs -f`
- **Shell:** `docker-compose exec app sh`
- **Database:** `docker-compose exec postgres psql -U lens_user -d lens_platform`
- **Restart:** `docker-compose restart`
- **Rebuild:** `docker-compose build --no-cache && docker-compose up -d`

---

**Happy Deploying!** 🚀
