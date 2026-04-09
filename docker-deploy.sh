#!/bin/bash

# Lens Platform - Docker Quick Deploy
# Usage: ./docker-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Lens Platform - Docker Deployment${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Please logout and login again for docker group changes to take effect${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}.env file not found. Creating from template...${NC}"
    cp .dockerenv.example .env
    echo -e "${YELLOW}Please edit .env file and fill in the required values:${NC}"
    echo "  - POSTGRES_PASSWORD"
    echo "  - BETTER_AUTH_SECRET"
    echo "  - BETTER_AUTH_URL"
    echo "  - NEXT_PUBLIC_APP_URL"
    echo "  - STRIPE_SECRET_KEY"
    echo "  - STRIPE_WEBHOOK_SECRET"
    echo ""
    echo -e "${YELLOW}Press Enter when you're ready to continue...${NC}"
    read
fi

# Validate .env has required values
if grep -q "your_" .env; then
    echo -e "${RED}ERROR: .env file still contains placeholder values!${NC}"
    echo "Please edit .env and replace all placeholder values first."
    exit 1
fi

echo -e "${GREEN}Step 1: Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "${GREEN}Step 2: Starting services...${NC}"
docker-compose up -d

echo -e "${GREEN}Step 3: Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
echo -e "${GREEN}Checking service status...${NC}"
docker-compose ps

echo -e "${GREEN}Step 4: Running database migrations...${NC}"
docker-compose exec app npx prisma migrate deploy || echo "Migrations skipped or failed"
docker-compose exec app npx prisma db push --accept-data-loss || echo "Push skipped or failed"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}Services:${NC}"
docker-compose ps
echo ""
echo -e "${GREEN}Access:${NC}"
echo "  App:     http://localhost:3000"
echo "  Nginx:   http://localhost"
echo ""
echo -e "${GREEN}Commands:${NC}"
echo "  View logs:      docker-compose logs -f"
echo "  View app logs:  docker-compose logs -f app"
echo "  Restart:        docker-compose restart"
echo "  Stop:           docker-compose down"
echo "  Shell access:   docker-compose exec app sh"
echo "  Database:       docker-compose exec postgres psql -U lens_user -d lens_platform"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Configure domain and SSL (see DOCKER_DEPLOYMENT.md)"
echo "  2. Setup Stripe webhooks"
echo "  3. Test signup and validation flows"
echo ""
