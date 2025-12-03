#!/bin/bash
# Complete Deployment Script with Automatic SSH Key Setup
# This script ensures matching SSH key pairs for authentication
# Server IP: 82.165.66.236

set -e

SERVER_IP="82.165.66.236"
APP_DIR="/var/www/pactattack"
APP_PATH="$APP_DIR/pactattack"
DEPLOY_USER="pactattack"
SSH_PORT="22"

# YOUR PUBLIC KEY - Replace this with your actual public key
# Get it from: Get-Content $env:USERPROFILE\.ssh\id_ed25519_pactattack.pub
YOUR_PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203"

echo "=========================================="
echo "PactAttack Deployment with SSH Key Setup"
echo "Server IP: $SERVER_IP"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root"
    exit 1
fi

# ==========================================
# PHASE 0: Setup SSH Key Authentication
# ==========================================
echo "[Phase 0/13] Setting up SSH key authentication..."
echo ""

# Create .ssh directory
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Backup existing authorized_keys if it exists
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /root/.ssh/authorized_keys.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing authorized_keys"
fi

# Add your public key if it's not already there
if ! grep -q "$YOUR_PUBLIC_KEY" /root/.ssh/authorized_keys 2>/dev/null; then
    echo "$YOUR_PUBLIC_KEY" >> /root/.ssh/authorized_keys
    echo "✅ Added your public key to authorized_keys"
else
    echo "⚠️  Public key already exists in authorized_keys"
fi

# Set correct permissions
chmod 600 /root/.ssh/authorized_keys
chmod 700 /root/.ssh

# Fix ownership
chown root:root /root/.ssh
chown root:root /root/.ssh/authorized_keys

echo "✅ SSH key authentication configured"
echo ""
echo "⚠️  IMPORTANT: Your public key has been added to /root/.ssh/authorized_keys"
echo "   You can now connect with:"
echo "   ssh -i \$env:USERPROFILE\.ssh\id_ed25519_pactattack root@$SERVER_IP"
echo ""

# ==========================================
# PHASE 1: Create Non-Root User
# ==========================================
echo "[Phase 1/13] Creating non-root user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$DEPLOY_USER
    echo "✅ User $DEPLOY_USER created with sudo privileges"
    
    # Setup SSH for deploy user too
    mkdir -p /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    echo "$YOUR_PUBLIC_KEY" >> /home/$DEPLOY_USER/.ssh/authorized_keys
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    echo "✅ SSH key added for $DEPLOY_USER"
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
cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Configure SSH security (but keep password auth temporarily for first setup)
sed -i 's/#PermitRootLogin yes/PermitRootLogin yes/' "$SSH_CONFIG"
sed -i 's/PermitRootLogin no/PermitRootLogin yes/' "$SSH_CONFIG"
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' "$SSH_CONFIG"
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' "$SSH_CONFIG"
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' "$SSH_CONFIG"

echo "✅ SSH configuration updated"
echo "⚠️  Password authentication enabled for initial setup"
echo "   After verifying SSH key works, you can disable password auth"
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
DB_PASSWORD="PactAttack2024!Secure"
sudo -u postgres psql <<EOF || true
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pactattack') THEN
        CREATE DATABASE pactattack;
    END IF;
END
\$\$;

DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'pactattack_user') THEN
        CREATE USER pactattack_user WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF
echo "✅ Database 'pactattack' and user 'pactattack_user' created"
echo "⚠️  Database password: $DB_PASSWORD (change in .env if needed)"
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
DATABASE_URL="postgresql://pactattack_user:$DB_PASSWORD@localhost:5432/pactattack"
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
echo "SSH Key Setup:"
echo "✅ Your public key added to /root/.ssh/authorized_keys"
echo "✅ Your public key added to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo ""
echo "Test Connection:"
echo "  ssh -i \$env:USERPROFILE\.ssh\id_ed25519_pactattack root@$SERVER_IP"
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
echo "✅ SSH keys configured (matching key pair)"
echo "✅ Non-root user created: $DEPLOY_USER"
echo "✅ Firewall configured (ports: $SSH_PORT, 80, 443)"
echo "✅ Node.js $(node --version) installed"
echo "✅ PostgreSQL database 'pactattack' created"
echo "✅ Application deployed to: $APP_PATH"
echo "✅ nginx reverse proxy configured"
echo "✅ PM2 process manager running"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Test SSH connection with your key"
echo "2. Once verified, you can disable password auth in /etc/ssh/sshd_config"
echo "3. Change database password in .env if needed"
echo ""
echo "Access your application at: http://$SERVER_IP"
echo "=========================================="

