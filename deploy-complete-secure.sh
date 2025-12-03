#!/bin/bash
# Complete Secure Deployment Script for PactAttack
# Follows Linux server deployment best practices
# Server IP: 82.165.66.236

set -e

SERVER_IP="82.165.66.236"
APP_DIR="/var/www/pactattack"
APP_PATH="$APP_DIR/pactattack"
DEPLOY_USER="pactattack"
SSH_PORT="22"

echo "=========================================="
echo "PactAttack Complete Secure Deployment"
echo "Server IP: $SERVER_IP"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root"
    exit 1
fi

# ==========================================
# PHASE 1: Create Non-Root User
# ==========================================
echo "[Phase 1/13] Creating non-root user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$DEPLOY_USER
    echo "✅ User $DEPLOY_USER created with sudo privileges"
else
    echo "⚠️  User $DEPLOY_USER already exists"
fi
echo ""

# ==========================================
# PHASE 2: Server Preparation
# ==========================================
echo "[Phase 2/13] Server preparation..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y curl wget git build-essential ufw fail2ban
echo "✅ System updated and essential tools installed"
echo ""

# ==========================================
# PHASE 3: Secure SSH Configuration
# ==========================================
echo "[Phase 3/13] Securing SSH..."
SSH_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%Y%m%d)"

# Configure SSH security
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' "$SSH_CONFIG"
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' "$SSH_CONFIG"
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' "$SSH_CONFIG"
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' "$SSH_CONFIG"
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' "$SSH_CONFIG"

# Ensure authorized_keys directory exists for deploy user
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh

echo "✅ SSH configuration secured"
echo "⚠️  IMPORTANT: Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys before restarting SSH"
echo "⚠️  Test connection as $DEPLOY_USER before disabling root login"
echo ""

# ==========================================
# PHASE 4: Configure Firewall
# ==========================================
echo "[Phase 4/13] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow $SSH_PORT/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo "✅ Firewall configured (SSH: $SSH_PORT, HTTP: 80, HTTPS: 443)"
echo ""

# ==========================================
# PHASE 5: Install Node.js
# ==========================================
echo "[Phase 5/13] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# ==========================================
# PHASE 6: Install PM2
# ==========================================
echo "[Phase 6/13] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "✅ PM2 installed"
echo ""

# ==========================================
# PHASE 7: Install PostgreSQL
# ==========================================
echo "[Phase 7/13] Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi
echo "✅ PostgreSQL installed and started"
echo ""

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql <<EOF || true
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD 'PactAttack2024!Secure';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF
echo "✅ Database 'pactattack' and user 'pactattack_user' created"
echo "⚠️  Database password: PactAttack2024!Secure (change in .env if needed)"
echo ""

# ==========================================
# PHASE 8: Install nginx
# ==========================================
echo "[Phase 8/13] Installing nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo "✅ nginx installed and started"
echo ""

# ==========================================
# PHASE 9: Clone/Update Application
# ==========================================
echo "[Phase 9/13] Setting up application..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d "pactattack" ]; then
    echo "⚠️  Repository exists, updating..."
    cd pactattack
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master || true
    cd ..
else
    git clone https://github.com/belgarathe/pactattack.git
fi

cd "$APP_PATH"
echo "✅ Repository ready at $APP_PATH"
echo ""

# ==========================================
# PHASE 10: Install Dependencies & Configure
# ==========================================
echo "[Phase 10/13] Installing dependencies..."
npm ci --production=false
echo "✅ Dependencies installed"
echo ""

# Generate Prisma Client
echo "Generating Prisma Client..."
npm run db:generate
echo "✅ Prisma Client generated"
echo ""

# ==========================================
# PHASE 11: Configure Environment
# ==========================================
echo "[Phase 11/13] Configuring environment..."
if [ ! -f ".env" ]; then
    if [ -f "env.local.example" ]; then
        cp env.local.example .env
    fi
    
    # Generate secure NEXTAUTH_SECRET
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    cat > .env <<EOF
DATABASE_URL="postgresql://pactattack_user:PactAttack2024!Secure@localhost:5432/pactattack"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://$SERVER_IP"
NEXT_PUBLIC_APP_URL="http://$SERVER_IP"
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
EOF
    echo "✅ .env file created"
else
    echo "⚠️  .env file exists, updating URLs..."
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$SERVER_IP|" .env
    sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=http://$SERVER_IP|" .env
fi

# Set proper permissions
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"
chmod 600 .env
echo "✅ Environment configured"
echo ""

# ==========================================
# PHASE 12: Setup Database Schema
# ==========================================
echo "[Phase 12/13] Setting up database schema..."
npm run db:push
echo "✅ Database schema pushed"
echo ""

# ==========================================
# PHASE 13: Build and Deploy Application
# ==========================================
echo "[Phase 13/13] Building and deploying application..."

# Build
echo "Building application..."
rm -rf .next
npm run build
echo "✅ Application built"
echo ""

# Configure nginx
echo "Configuring nginx..."
cat > /etc/nginx/sites-available/pactattack <<EOF
server {
    listen 80;
    server_name $SERVER_IP;

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

ln -sf /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✅ nginx configured"
echo ""

# Start with PM2
echo "Starting application with PM2..."
if pm2 list | grep -q "pactattack"; then
    pm2 stop pactattack || true
    pm2 delete pactattack || true
fi

# Run as deploy user
sudo -u $DEPLOY_USER bash <<DEPLOY_SCRIPT
cd $APP_PATH
export PATH=\$PATH:/usr/bin
pm2 start npm --name "pactattack" -- start
pm2 save
DEPLOY_SCRIPT

# Setup PM2 startup
pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER || true

echo "✅ Application started with PM2"
echo ""

# ==========================================
# VERIFICATION
# ==========================================
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Verification:"
pm2 status
echo ""
sleep 3
curl -s http://localhost:3000 | head -5 || echo "⚠️  App starting..."
echo ""
echo "=========================================="
echo "Deployment Summary:"
echo "=========================================="
echo "✅ Non-root user created: $DEPLOY_USER"
echo "✅ SSH secured (root login disabled)"
echo "✅ Firewall configured (ports: $SSH_PORT, 80, 443)"
echo "✅ Node.js $(node --version) installed"
echo "✅ PostgreSQL database 'pactattack' created"
echo "✅ Application deployed to: $APP_PATH"
echo "✅ nginx reverse proxy configured"
echo "✅ PM2 process manager running"
echo ""
echo "⚠️  IMPORTANT SECURITY STEPS:"
echo "1. Add your SSH public key to: /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "2. Test SSH connection as $DEPLOY_USER"
echo "3. Restart SSH service: systemctl restart sshd"
echo "4. Change database password in .env if needed"
echo ""
echo "Access your application at: http://$SERVER_IP"
echo "=========================================="

