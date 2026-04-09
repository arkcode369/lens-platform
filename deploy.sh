#!/bin/bash

# Lens Platform - AWS VPS Deployment Script
# Usage: ./deploy.sh <domain-name>

set -e

DOMAIN=${1:-"localhost"}
APP_NAME="lens"
APP_DIR="/home/ec2-user/lens-platform"

echo "========================================="
echo "Lens Platform Deployment Script"
echo "========================================="
echo ""
echo "Domain: $DOMAIN"
echo "App Directory: $APP_DIR"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Step 1: Check prerequisites
log_info "Checking prerequisites..."
check_command git
check_command node
check_command npm

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_warn "Node.js version should be 18+. Current version: $(node -v)"
    log_info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Step 2: Install PM2 globally
log_info "Installing PM2..."
npm install -g pm2

# Step 3: Clone or update repository
if [ -d "$APP_DIR" ]; then
    log_info "Repository already exists. Updating..."
    cd $APP_DIR
    git pull origin main
else
    log_info "Cloning repository..."
    git clone https://github.com/your-repo/lens-platform.git $APP_DIR
    cd $APP_DIR
fi

# Step 4: Install dependencies
log_info "Installing dependencies..."
npm ci --legacy-peer-deps

# Step 5: Setup environment variables
if [ ! -f ".env.production" ]; then
    log_info "Creating .env.production..."
    cp .env.example .env.production
    log_warn "Please edit .env.production and fill in the required values:"
    log_warn "  - DATABASE_URL"
    log_warn "  - BETTER_AUTH_SECRET"
    log_warn "  - BETTER_AUTH_URL"
    log_warn "  - NEXT_PUBLIC_APP_URL"
    log_warn "  - STRIPE_SECRET_KEY"
    log_warn "  - STRIPE_WEBHOOK_SECRET"
    log_info "Press Enter when you're ready to continue..."
    read
else
    log_info "Environment file already exists."
fi

# Step 6: Generate Prisma client
log_info "Generating Prisma client..."
npx prisma generate

# Step 7: Push database schema
log_info "Pushing database schema..."
npx prisma db push --accept-data-loss

# Step 8: Build production
log_info "Building production..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Step 9: Start application with PM2
log_info "Starting application with PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start npm --name "$APP_NAME" -- start
pm2 save

# Step 10: Setup Nginx (optional)
read -p "Do you want to setup Nginx reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Setting up Nginx..."
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Create Nginx config
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    
    log_info "Nginx configured successfully!"
    
    # Setup SSL with Let's Encrypt
    read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setting up SSL..."
        
        # Install Certbot
        if ! command -v certbot &> /dev/null; then
            sudo apt install -y certbot python3-certbot-nginx
        fi
        
        # Get SSL certificate
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email your-email@example.com
        
        log_info "SSL configured successfully!"
    fi
fi

# Step 11: Final status
log_info "========================================="
log_info "Deployment Complete!"
log_info "========================================="
log_info ""
log_info "Application Status:"
pm2 status $APP_NAME
log_info ""
log_info "Logs:"
log_info "  pm2 logs $APP_NAME"
log_info ""
log_info "Restart:"
log_info "  pm2 restart $APP_NAME"
log_info ""
log_info "Stop:"
log_info "  pm2 stop $APP_NAME"
log_info ""
log_info "Access:"
if [ "$DOMAIN" = "localhost" ]; then
    log_info "  http://localhost:3000"
else
    log_info "  http://$DOMAIN:3000"
    log_info "  (or https://$DOMAIN if SSL is configured)"
fi
log_info ""
log_info "Next Steps:"
log_info "  1. Configure environment variables in $APP_DIR/.env.production"
log_info "  2. Restart app: pm2 restart $APP_NAME"
log_info "  3. Test: curl http://localhost:3000"
log_info "  4. Setup Stripe webhooks: https://dashboard.stripe.com/webhooks"
log_info ""
