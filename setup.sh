#!/bin/bash

# AI Product Platform - Setup Script
# This script initializes the project for development

set -e

echo "🚀 Setting up AI Product Platform..."

# Navigate to project directory
cd "$(dirname "$0")"

# Clean and reinstall dependencies if needed
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules..."
    rm -rf node_modules package-lock.json
fi

echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npm run db:generate

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your configuration"
else
    echo "✅ .env.local already exists"
fi

# Start Docker database
echo "🐳 Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Push schema to database
echo "📊 Pushing database schema..."
npm run db:push

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Review and update .env.local if needed"
echo "   2. Start development server: npm run dev"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "📖 Documentation: See README.md for more information"
