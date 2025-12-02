#!/bin/bash
# Complete deployment script for PactAttack
# Run this on your server: bash deploy-full.sh

set -e

echo "🚀 PactAttack Complete Deployment Script"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/debian_version ]; then
    OS="debian"
    echo -e "${GREEN}Detected: Debian/Ubuntu${NC}"
elif [ -f /etc/redhat-release ]; then
    OS="rhel"
    echo -e "${GREEN}Detected: RHEL/CentOS/Rocky${NC}"
else
    echo -e "${RED}Unknown OS. Please run manually.${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "\n${YELLOW}[1/11] Updating system...${NC}"
if [ "$OS" = "debian" ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq curl wget git build-essential python3
else
    yum update -y -q
    yum install -y -q curl wget git gcc gcc-c++ make python3
fi
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install Node.js 20.x
echo -e "\n${YELLOW}[2/11] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null || [ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    if [ "$OS" = "debian" ]; then
        apt-get install -y -qq nodejs
    else
        yum install -y -q nodejs
    fi
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"

# Step 3: Install PostgreSQL
echo -e "\n${YELLOW}[3/11] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    if [ "$OS" = "debian" ]; then
        apt-get install -y -qq postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql > /dev/null 2>&1
    else
        yum install -y -q postgresql-server postgresql-contrib
        if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
            postgresql-setup --initdb > /dev/null 2>&1
        fi
        systemctl start postgresql
        systemctl enable postgresql > /dev/null 2>&1
    fi
    sleep 2
fi
echo -e "${GREEN}✅ PostgreSQL installed${NC}"

# Step 4: Create database (with secure password prompt)
echo -e "\n${YELLOW}[4/11] Setting up database...${NC}"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated database password: $DB_PASSWORD"
echo "⚠️  SAVE THIS PASSWORD - You'll need it for .env file!"

sudo -u postgres psql <<EOF > /dev/null 2>&1
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD '$DB_PASSWORD';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF

echo -e "${GREEN}✅ Database created${NC}"
echo -e "${YELLOW}Database URL: postgresql://pactattack_user:$DB_PASSWORD@localhost:5432/pactattack${NC}"

# Step 5: Install PM2
echo -e "\n${YELLOW}[5/11] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
fi
echo -e "${GREEN}✅ PM2 installed${NC}"

# Step 6: Install nginx
echo -e "\n${YELLOW}[6/11] Installing nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    if [ "$OS" = "debian" ]; then
        apt-get install -y -qq nginx
    else
        yum install -y -q nginx
    fi
    systemctl start nginx
    systemctl enable nginx > /dev/null 2>&1
fi
echo -e "${GREEN}✅ nginx installed${NC}"

# Step 7: Create app directory
echo -e "\n${YELLOW}[7/11] Setting up application directory...${NC}"
APP_DIR="/var/www/pactattack"
mkdir -p "$APP_DIR"
echo -e "${GREEN}✅ Directory created: $APP_DIR${NC}"
echo -e "${YELLOW}⚠️  Next: Upload your application files to $APP_DIR${NC}"

# Step 8: Configure nginx
echo -e "\n${YELLOW}[8/11] Configuring nginx...${NC}"
if [ "$OS" = "debian" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/pactattack"
    NGINX_ENABLED="/etc/nginx/sites-enabled/pactattack"
else
    NGINX_CONFIG="/etc/nginx/conf.d/pactattack.conf"
fi

cat > "$NGINX_CONFIG" <<'NGINXEOF'
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

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINXEOF

if [ "$OS" = "debian" ]; then
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
fi

nginx -t > /dev/null 2>&1
systemctl reload nginx
echo -e "${GREEN}✅ nginx configured${NC}"

# Step 9: Install certbot
echo -e "\n${YELLOW}[9/11] Installing certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    if [ "$OS" = "debian" ]; then
        apt-get install -y -qq certbot python3-certbot-nginx
    else
        yum install -y -q certbot python3-certbot-nginx
    fi
fi
echo -e "${GREEN}✅ certbot installed${NC}"

# Summary
echo -e "\n${GREEN}=========================================="
echo "✅ Server Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Upload your application to: $APP_DIR"
echo "   Example: scp -r pactattack root@82.165.66.236:/var/www/"
echo ""
echo "2. Create .env file in $APP_DIR/pactattack with:"
echo "   DATABASE_URL=\"postgresql://pactattack_user:$DB_PASSWORD@localhost:5432/pactattack\""
echo "   NEXTAUTH_URL=\"http://82.165.66.236\""
echo "   NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\""
echo "   (Add your Stripe keys and other variables)"
echo ""
echo "3. On the server, run:"
echo "   cd $APP_DIR/pactattack"
echo "   npm install"
echo "   npm run db:generate"
echo "   npm run db:push"
echo "   npm run build"
echo "   pm2 start npm --name \"pactattack\" -- start"
echo "   pm2 save"
echo ""
echo "4. For SSL (if you have a domain):"
echo "   ./setup-ssl.sh yourdomain.com"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Save the database password shown above!${NC}"
echo ""

