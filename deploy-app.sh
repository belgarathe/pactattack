#!/bin/bash
# Deploy application script - Run this AFTER uploading files to server

set -e

APP_DIR="/var/www/pactattack/pactattack"

echo "🚀 Deploying PactAttack Application..."
echo ""

# Check if directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Application directory not found at $APP_DIR"
    echo "Please upload your files first!"
    exit 1
fi

cd "$APP_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Are you sure you're in the right directory?"
    exit 1
fi

# Step 1: Check .env file
echo "📝 Checking .env file..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    if [ -f "env.local.example" ]; then
        echo "Creating .env from example..."
        cp env.local.example .env
        echo "✅ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env file with: nano .env"
        echo "Add your database password and other variables!"
        echo ""
        read -p "Press Enter after you've configured .env file..."
    else
        echo "❌ env.local.example not found either!"
        echo "Please create .env file manually"
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Step 2: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Step 3: Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npm run db:generate

# Step 4: Push database schema
echo ""
echo "🗄️  Setting up database..."
echo "⚠️  Make sure DATABASE_URL in .env is correct!"
read -p "Press Enter to continue with database setup..."
npm run db:push

# Step 5: Build application
echo ""
echo "🏗️  Building application..."
npm run build

# Step 6: Check if PM2 app already exists
if pm2 list | grep -q "pactattack"; then
    echo ""
    echo "⚠️  Application already running in PM2"
    read -p "Do you want to restart it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 restart pactattack
    else
        echo "Keeping existing process running"
    fi
else
    # Step 7: Start with PM2
    echo ""
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
echo "View logs with: pm2 logs pactattack"
echo "Restart with: pm2 restart pactattack"
echo ""

# Test if app is responding
sleep 3
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is responding on port 3000"
else
    echo "⚠️  Application may not be responding yet"
    echo "Check logs: pm2 logs pactattack"
fi

echo ""
echo "Next: Configure nginx to point to your application"
echo "See DEPLOY_NEXT_STEPS.md for nginx configuration"

