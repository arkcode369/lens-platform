#!/bin/bash

# Deployment script for AI Product Platform
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="ai-product-platform"
REMOTE_HOST=${REMOTE_HOST:-"your-vps-ip"}
REMOTE_USER=${REMOTE_USER:-"root"}
REMOTE_DIR=${REMOTE_DIR:-"/opt/${PROJECT_NAME}"}

echo "🚀 Starting deployment to ${ENVIRONMENT}..."

# Step 1: Pull latest code
echo "📦 Pulling latest code..."
git pull origin main

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Step 4: Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Step 5: Build application
echo "🏗️ Building application..."
npm run build

# Step 6: Restart services
echo "🔄 Restarting services..."
if command -v pm2 &> /dev/null; then
    pm2 restart ${PROJECT_NAME}
    pm2 save
elif command -v systemctl &> /dev/null; then
    sudo systemctl restart ${PROJECT_NAME}
elif command -v docker &> /dev/null; then
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d --build
else
    echo "⚠️ No service manager found. Please restart manually."
fi

# Step 7: Run health check
echo "🏥 Running health check..."
sleep 5
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    exit 1
fi

echo "✨ Deployment completed successfully!"
