#!/bin/bash

# Health check script for monitoring
# Usage: ./health-check.sh

set -e

APP_URL=${APP_URL:-"http://localhost:3000"}
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres@localhost:5432/ai_product_platform"}
REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}

echo "🏥 Running health checks..."

# Check application health
echo "📡 Checking application..."
if curl -f ${APP_URL}/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "❌ Application is unhealthy"
    exit 1
fi

# Check database connection
echo "🗄️ Checking database..."
if pg_isready -h localhost -U postgres > /dev/null 2>&1; then
    echo "✅ Database is healthy"
else
    echo "❌ Database is unreachable"
    exit 1
fi

# Check Redis connection
echo "💾 Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is unreachable"
    exit 1
fi

# Check disk space
echo "💿 Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ ${DISK_USAGE} -lt 80 ]; then
    echo "✅ Disk usage: ${DISK_USAGE}%"
else
    echo "⚠️ Disk usage: ${DISK_USAGE}% (high)"
fi

# Check memory usage
echo "🧠 Checking memory..."
MEMORY_USAGE=$(free | awk 'NR==2 {printf("%.0f", $3/$2 * 100)}')
if [ ${MEMORY_USAGE} -lt 80 ]; then
    echo "✅ Memory usage: ${MEMORY_USAGE}%"
else
    echo "⚠️ Memory usage: ${MEMORY_USAGE}% (high)"
fi

echo "✨ All health checks passed!"
