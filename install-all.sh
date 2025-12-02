#!/bin/bash
# Simple installation script for Ubuntu 22.04 with Plesk
# Run: bash install-all.sh

set -e

echo "🚀 Installing Node.js, PostgreSQL, PM2, and nginx..."

# Step 1: Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "✅ Node.js installed: $(node --version)"
echo "✅ npm installed: $(npm --version)"

# Step 2: Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo "✅ PostgreSQL installed: $(psql --version)"

# Step 3: Create Database
echo "📦 Creating database..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

sudo -u postgres psql <<EOF
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD '$DB_PASSWORD';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF

echo "✅ Database created!"
echo ""
echo "⚠️  IMPORTANT: Save this database password!"
echo "DATABASE_URL=\"postgresql://pactattack_user:$DB_PASSWORD@localhost:5432/pactattack\""
echo ""

# Step 4: Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

echo "✅ PM2 installed: $(pm2 --version)"

# Step 5: Install nginx (if not already installed)
echo "📦 Checking nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "✅ nginx installed"
else
    echo "✅ nginx already installed"
fi

echo ""
echo "✅ All installations complete!"
echo ""
echo "Next steps:"
echo "1. Upload your application files"
echo "2. Configure .env file with the database URL shown above"
echo "3. Run: npm install && npm run build"
echo "4. Start with PM2: pm2 start npm --name 'pactattack' -- start"

