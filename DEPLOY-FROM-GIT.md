# Deploy From Git Repository

## Your Repository
**URL:** https://github.com/belgarathe/pactattack.git

## Deploy to Server

### Step 1: Access Your Server Terminal

You need to run commands on your server. Try one of these methods:

**A. Your Hosting Provider's Console:**
- Login to your hosting provider's website
- Find "Console", "Shell", "Terminal", or "VNC" option
- Click to open terminal

**B. Ask Provider to Enable SSH:**
- Contact your hosting provider
- Ask them to add your SSH key or enable password auth
- Your SSH key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email`

**C. Use Provider's Git Deployment Feature:**
- Some providers have "Git Deployment" in their control panel
- Connect your GitHub repo and auto-deploy

---

### Step 2: Clone Repository on Server

Once you can run commands on server, execute:

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone https://github.com/belgarathe/pactattack.git

# Navigate into project
cd pactattack/pactattack
```

**Note:** The repository has a nested structure, so after cloning you need to go into `pactattack/pactattack`

---

### Step 3: Install Dependencies

```bash
cd /var/www/pactattack/pactattack
npm install
```

---

### Step 4: Create .env File

```bash
# Copy example file
cp env.local.example .env

# Edit the file
nano .env
```

**Add these variables:**

```env
# Database (use the password you saved earlier!)
DATABASE_URL="postgresql://pactattack_user:YOUR_DATABASE_PASSWORD@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="generate-with-command-below"
NEXT_PUBLIC_APP_URL="http://82.165.66.236"

# Stripe (get from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Pokemon TCG API
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 5: Setup Database

```bash
npm run db:generate
npm run db:push
npm run db:seed  # Optional
```

---

### Step 6: Build Application

```bash
npm run build
```

---

### Step 7: Start with PM2

```bash
pm2 start npm --name "pactattack" -- start
pm2 save
pm2 startup  # If not already configured
```

---

### Step 8: Configure nginx

```bash
# Create nginx config
nano /etc/nginx/sites-available/pactattack
```

**Paste this:**

```nginx
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
```

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### Step 9: Test

```bash
# Check app is running
pm2 status
pm2 logs pactattack

# Test locally
curl http://localhost:3000
```

**Open in browser:** `http://82.165.66.236`

---

## All-in-One Deployment Script

Save this as `deploy.sh` on your server:

```bash
#!/bin/bash
cd /var/www
git clone https://github.com/belgarathe/pactattack.git
cd pactattack/pactattack
npm install
cp env.local.example .env
echo "✅ Repository cloned and dependencies installed!"
echo "⚠️  Next: Edit .env file with: nano .env"
echo "Then run: npm run db:generate && npm run db:push && npm run build && pm2 start npm --name 'pactattack' -- start"
```

---

## Troubleshooting

### Git clone fails?
```bash
# Install git if not installed
apt-get install -y git
```

### npm install fails?
```bash
# Check Node.js version
node --version  # Should be v20.x

# Clear npm cache
npm cache clean --force
```

### Database connection fails?
```bash
# Test database
psql -U pactattack_user -d pactattack -h localhost

# Check .env file
cat .env | grep DATABASE_URL
```

---

## Quick Commands Summary

```bash
# Clone
cd /var/www && git clone https://github.com/belgarathe/pactattack.git

# Setup
cd pactattack/pactattack
npm install
nano .env  # Configure

# Deploy
npm run db:generate
npm run db:push
npm run build
pm2 start npm --name "pactattack" -- start
pm2 save

# Configure nginx (see Step 8 above)
```

---

## Need Help Accessing Server?

**If you still can't access server terminal, tell me:**
1. Your hosting provider name
2. What options you see in their control panel
3. If they have "Git Deployment" feature

Then I can provide exact steps for your provider!

