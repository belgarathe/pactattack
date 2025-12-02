#!/bin/bash
# Complete deployment script - Run this on your server
# Repository: https://github.com/belgarathe/pactattack

set -e

echo "🚀 Deploying PactAttack (belgarathe/pactattack)"
echo "================================================"
echo ""

REPO_URL="https://github.com/belgarathe/pactattack.git"
APP_DIR="/var/www/pactattack/pactattack"

# Step 1: Clone or Update Repository
if [ -d "/var/www/pactattack" ]; then
    echo "📥 Repository exists, updating..."
    cd /var/www/pactattack
    git pull origin main
    cd pactattack
else
    echo "📥 Cloning repository..."
    cd /var/www
    git clone "$REPO_URL"
    cd "$APP_DIR"
fi

# Step 2: Check .env file
echo ""
echo "📝 Checking .env file..."
if [ ! -f ".env" ]; then
    if [ -f "env.local.example" ]; then
        echo "Creating .env from example..."
        cp env.local.example .env
        echo ""
        echo "⚠️  IMPORTANT: Edit .env file now!"
        echo "Run: nano .env"
        echo ""
        echo "Required variables:"
        echo "  - DATABASE_URL (with your database password)"
        echo "  - NEXTAUTH_URL=http://82.165.66.236"
        echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
        echo "  - NEXT_PUBLIC_APP_URL=http://82.165.66.236"
        echo "  - Stripe keys"
        echo ""
        read -p "Press Enter after configuring .env file..."
    else
        echo "❌ env.local.example not found!"
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Step 3: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Step 4: Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npm run db:generate

# Step 5: Setup database
echo ""
echo "🗄️  Setting up database..."
read -p "Press Enter to run database migrations..."
npm run db:push

# Step 6: Build application
echo ""
echo "🏗️  Building application..."
npm run build

# Step 7: Configure nginx (if not already done)
echo ""
if [ ! -f "/etc/nginx/sites-available/pactattack" ]; then
    echo "🔧 Configuring nginx..."
    cat > /etc/nginx/sites-available/pactattack <<'NGINXEOF'
server {
    listen 80;
    server_name 82.165.66.236;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

    ln -sf /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    echo "✅ nginx configured"
else
    echo "✅ nginx already configured"
fi

# Step 8: Start/restart PM2
echo ""
if pm2 list | grep -q "pactattack"; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart pactattack
else
    echo "🚀 Starting application with PM2..."
    pm2 start npm --name "pactattack" -- start
    pm2 save
    pm2 startup 2>/dev/null || true
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Application Status:"
pm2 status

echo ""
echo "📍 Access your application at:"
echo "   http://82.165.66.236"
echo ""
echo "📊 Useful Commands:"
echo "   pm2 logs pactattack      # View logs"
echo "   pm2 restart pactattack   # Restart app"
echo "   pm2 status               # Check status"
echo ""

# Test application
sleep 3
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is responding!"
else
    echo "⚠️  Application may still be starting..."
    echo "Check logs: pm2 logs pactattack"
fi

echo ""
echo "🎉 Deployment finished!"
echo "Repository: https://github.com/belgarathe/pactattack"

