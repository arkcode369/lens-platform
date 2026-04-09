#!/bin/bash

# VPS initialization script
# Run this on a fresh VPS to set up the environment

set -e

echo "🔧 Setting up VPS for AI Product Platform..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install PM2 (optional, for non-Docker deployments)
echo "🌐 Installing PM2..."
npm install -g pm2

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/ai-product-platform
cd /opt/ai-product-platform

# Clone repository (if using git)
# git clone <repo-url> .

# Create .env file
echo "🔐 Creating .env file..."
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-changeme}@localhost:5432/ai_product_platform
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}
NEXT_PUBLIC_APP_URL=https://${DOMAIN:-localhost}
REDDIT_API_KEY=${REDDIT_API_KEY:-}
TWITTER_API_KEY=${TWITTER_API_KEY:-}
PRODUCT_HUNT_API_KEY=${PRODUCT_HUNT_API_KEY:-}
LITE_LLM_API_KEY=${LITE_LLM_API_KEY:-}
EOF

# Set permissions
chown -R $USER:$USER /opt/ai-product-platform
chmod 755 /opt/ai-product-platform

# Setup firewall (UFW)
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install SSL certificates (Let's Encrypt)
echo "🔒 Installing SSL certificates..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d ${DOMAIN:-localhost}

echo "✨ VPS setup completed!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with actual values"
echo "2. Run: docker-compose -f docker-compose.prod.yml up -d"
echo "3. Run database migrations: npx prisma migrate deploy"
echo "4. Set up Stripe webhooks pointing to: https://${DOMAIN}/api/billing/webhook"
