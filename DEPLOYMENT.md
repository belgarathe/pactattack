# PactAttack Deployment Guide

## Server Information
- **Host**: 82.165.66.236
- **Username**: root
- **SSH Key**: Configured

## Prerequisites
- SSH access to server
- Git repository URL (if using Git)
- Environment variables ready

## Deployment Steps

### Step 1: Connect to Server

```bash
ssh root@82.165.66.236
```

### Step 2: Run Initial Setup Script

```bash
# Make script executable
chmod +x deploy.sh

# Run the setup script
./deploy.sh
```

Or run commands manually (see below).

### Step 3: Clone Your Application

**Option A: Using Git**
```bash
cd /var/www
git clone <your-repo-url> pactattack
cd pactattack/pactattack
```

**Option B: Upload via SCP**
```bash
# From your local machine
scp -r pactattack root@82.165.66.236:/var/www/
```

### Step 4: Configure Environment Variables

```bash
cd /var/www/pactattack/pactattack
cp env.local.example .env
nano .env
```

Required environment variables:
```env
# Database
DATABASE_URL="postgresql://pactattack_user:YOUR_PASSWORD@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://82.165.66.236"

# Pokemon TCG API (optional)
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Step 5: Install Dependencies and Setup Database

```bash
cd /var/www/pactattack/pactattack
npm install

# Generate Prisma Client
npm run db:generate

# Push database schema
npm run db:push

# (Optional) Seed database
npm run db:seed
```

### Step 6: Build the Application

```bash
npm run build
```

### Step 7: Start with PM2

```bash
# Start the application
pm2 start npm --name "pactattack" -- start

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs pactattack
```

### Step 8: Configure nginx

Create nginx configuration:

```bash
nano /etc/nginx/sites-available/pactattack
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name 82.165.66.236;

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
    }
}
```

Enable the site:
```bash
# For Debian/Ubuntu
ln -s /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/

# For RHEL/CentOS/Rocky
# Configuration goes in /etc/nginx/conf.d/pactattack.conf

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 9: Set Up SSL with Let's Encrypt

```bash
# Install certbot
if [ -f /etc/debian_version ]; then
    apt-get install -y certbot python3-certbot-nginx
elif [ -f /etc/redhat-release ]; then
    yum install -y certbot python3-certbot-nginx
fi

# Get SSL certificate (replace with your domain if you have one)
certbot --nginx -d yourdomain.com

# Or for IP-based (requires DNS setup)
# certbot certonly --standalone -d yourdomain.com

# Auto-renewal is set up automatically
```

### Step 10: Update Environment for Production

After SSL is set up, update `.env`:
```env
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Restart the application:
```bash
pm2 restart pactattack
```

## Useful Commands

### PM2 Commands
```bash
pm2 status              # Check app status
pm2 logs pactattack     # View logs
pm2 restart pactattack  # Restart app
pm2 stop pactattack     # Stop app
pm2 delete pactattack   # Remove from PM2
```

### Database Commands
```bash
# Connect to database
sudo -u postgres psql -d pactattack

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### nginx Commands
```bash
nginx -t                # Test configuration
systemctl reload nginx  # Reload nginx
systemctl restart nginx # Restart nginx
systemctl status nginx  # Check status
```

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs pactattack

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Check environment variables
pm2 env pactattack
```

### Database connection issues
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U pactattack_user -d pactattack -h localhost
```

### nginx issues
```bash
# Check nginx error logs
tail -f /var/log/nginx/error.log

# Check nginx access logs
tail -f /var/log/nginx/access.log
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Set up firewall (UFW or firewalld)
- [ ] Disable root SSH login (use sudo user)
- [ ] Set up SSH key authentication only
- [ ] Configure fail2ban
- [ ] Set up automatic security updates
- [ ] Configure SSL certificate
- [ ] Review and secure environment variables

## Firewall Setup

```bash
# Ubuntu/Debian (UFW)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# RHEL/CentOS/Rocky (firewalld)
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

