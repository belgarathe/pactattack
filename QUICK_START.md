# Quick Start Deployment Guide

## 🚀 Fastest Way to Deploy

### Step 1: Upload Files to Server

From your local machine (PowerShell):

```powershell
# Navigate to project root
cd F:\PA

# Upload the entire pactattack folder
scp -r pactattack root@82.165.66.236:/var/www/
```

### Step 2: Connect to Server

```powershell
ssh root@82.165.66.236
```

### Step 3: Run Full Deployment Script

On the server:

```bash
cd /var/www/pactattack
chmod +x deploy-full.sh
bash deploy-full.sh
```

This script will:
- ✅ Update system
- ✅ Install Node.js 20.x
- ✅ Install PostgreSQL
- ✅ Create database
- ✅ Install PM2
- ✅ Install nginx
- ✅ Configure nginx
- ✅ Install certbot

**⚠️ IMPORTANT:** The script will generate a database password. **SAVE IT!**

### Step 4: Configure Environment Variables

```bash
cd /var/www/pactattack/pactattack
cp env.local.example .env
nano .env
```

Add these variables (use the database password from Step 3):

```env
# Database (use password from deploy script)
DATABASE_URL="postgresql://pactattack_user:YOUR_PASSWORD_HERE@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Stripe (get from Stripe dashboard)
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

### Step 5: Install Dependencies & Setup Database

```bash
cd /var/www/pactattack/pactattack
npm install
npm run db:generate
npm run db:push
npm run db:seed  # Optional: seed with sample data
```

### Step 6: Build Application

```bash
npm run build
```

### Step 7: Start with PM2

```bash
pm2 start npm --name "pactattack" -- start
pm2 save
pm2 startup  # If not already done
```

### Step 8: Check Status

```bash
# Check app is running
pm2 status

# View logs
pm2 logs pactattack

# Check nginx
systemctl status nginx

# Test website
curl http://localhost:3000
```

### Step 9: Access Your Site

Open in browser: `http://82.165.66.236`

### Step 10: Set Up SSL (Optional - requires domain)

If you have a domain pointing to your server:

```bash
cd /var/www/pactattack
chmod +x setup-ssl.sh
./setup-ssl.sh yourdomain.com
```

Then update `.env`:
```env
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Restart:
```bash
pm2 restart pactattack
```

## 🔧 Useful Commands

### View Logs
```bash
pm2 logs pactattack
pm2 logs pactattack --lines 100  # Last 100 lines
```

### Restart Application
```bash
pm2 restart pactattack
```

### Stop Application
```bash
pm2 stop pactattack
```

### Database Access
```bash
sudo -u postgres psql -d pactattack
```

### Update Application
```bash
cd /var/www/pactattack/pactattack
git pull  # If using git
npm install
npm run build
pm2 restart pactattack
```

## 🐛 Troubleshooting

### App won't start
```bash
pm2 logs pactattack
# Check for errors in logs
```

### Database connection error
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U pactattack_user -d pactattack -h localhost
```

### Port 3000 already in use
```bash
# Find what's using port 3000
netstat -tulpn | grep 3000

# Kill the process or change port in .env
```

### nginx not working
```bash
# Check nginx status
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/error.log

# Test nginx config
nginx -t
```

## 📝 Notes

- Default app runs on port 3000
- nginx proxies port 80 to 3000
- PM2 keeps app running after server restart
- Database password is generated during setup - save it!
- SSL requires a domain name (can't use IP with Let's Encrypt)

