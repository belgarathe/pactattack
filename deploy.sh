#!/bin/bash
# Deployment script for PactAttack
# Run this on your server as root

set -e  # Exit on error

echo "🚀 Starting PactAttack Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${YELLOW}📦 Step 1: Updating system packages...${NC}"
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl wget git build-essential python3
elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Rocky
    yum update -y
    yum install -y curl wget git gcc gcc-c++ make python3
else
    echo -e "${RED}Unknown Linux distribution. Please install manually.${NC}"
    exit 1
fi

# Step 2: Install Node.js 20.x
echo -e "${YELLOW}📦 Step 2: Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    if [ -f /etc/debian_version ]; then
        apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        yum install -y nodejs
    fi
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js already installed: $NODE_VERSION${NC}"
fi

# Verify Node.js installation
node --version
npm --version

# Step 3: Install PostgreSQL
echo -e "${YELLOW}📦 Step 3: Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    if [ -f /etc/debian_version ]; then
        apt-get install -y postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql
    elif [ -f /etc/redhat-release ]; then
        yum install -y postgresql-server postgresql-contrib
        postgresql-setup --initdb
        systemctl start postgresql
        systemctl enable postgresql
    fi
else
    echo -e "${GREEN}PostgreSQL already installed${NC}"
fi

# Create database and user
echo -e "${YELLOW}📦 Creating database and user...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD 'changeme_secure_password_here';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF

echo -e "${GREEN}✅ Database created. Remember to update the password in .env file!${NC}"

# Step 4: Install PM2
echo -e "${YELLOW}📦 Step 4: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
else
    echo -e "${GREEN}PM2 already installed${NC}"
fi

# Step 5: Install nginx
echo -e "${YELLOW}📦 Step 5: Installing nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    if [ -f /etc/debian_version ]; then
        apt-get install -y nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y nginx
    fi
    systemctl start nginx
    systemctl enable nginx
else
    echo -e "${GREEN}nginx already installed${NC}"
fi

echo -e "${GREEN}✅ Basic server setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clone your repository"
echo "2. Configure .env file"
echo "3. Run database migrations"
echo "4. Build the application"
echo "5. Start with PM2"
echo "6. Configure nginx"
echo "7. Set up SSL"

