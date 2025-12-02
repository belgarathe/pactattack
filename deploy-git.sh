#!/bin/bash
# Complete deployment script from Git repository
# Run this on your server

set -e

REPO_URL="https://github.com/belgarathe/pactattack.git"
APP_DIR="/var/www/pactattack"

echo "🚀 Deploying PactAttack from Git..."
echo "Repository: $REPO_URL"
echo ""

# Step 1: Clone repository
echo "📥 Cloning repository..."
if [ -d "$APP_DIR" ]; then
    echo "⚠️  Directory already exists. Updating instead..."
    cd "$APP_DIR"
    git pull
    cd pactattack
else
    cd /var/www
    git clone "$REPO_URL"
    cd "$APP_DIR/pactattack"
fi

# Step 2: Check .env file
echo ""
echo "📝 Checking .env file..."
if [ ! -f ".env" ]; then
    if [ -f "env.local.example" ]; then
        cp env.local.example .env
        echo "✅ Created .env from example"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env file now!"
        echo "Run: nano .env"
        echo "Add your database password and other variables"
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
echo "⚠️  Make sure DATABASE_URL in .env is correct!"
read -p "Press Enter to continue..."
npm run db:push

# Step 6: Build application
echo ""
echo "🏗️  Building application..."
npm run build

# Step 7: Stop existing PM2 process if running
echo ""
if pm2 list | grep -q "pactattack"; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart pactattack
else
    echo "🚀 Starting application with PM2..."
    pm2 start npm --name "pactattack" -- start
    pm2 save
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Application status:"
pm2 status

echo ""
echo "View logs: pm2 logs pactattack"
echo "Restart: pm2 restart pactattack"
echo ""

# Test
sleep 3
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is running on port 3000"
    echo "Access at: http://82.165.66.236"
else
    echo "⚠️  Application may still be starting..."
    echo "Check logs: pm2 logs pactattack"
fi

echo ""
echo "Next: Configure nginx (if not already done)"
echo "See DEPLOY-FROM-GIT.md for nginx configuration"

