# 🚀 Final Deployment Guide - belgarathe/pactattack

## Your Setup ✅
- **GitHub:** belgarathe/pactattack
- **Repository:** https://github.com/belgarathe/pactattack
- **Server:** 82.165.66.236
- **Cursor:** Connected to GitHub ✅

## 🎯 Three Ways to Deploy

### Option 1: Manual Deployment (Best for First Time)

#### Access Your Server Terminal

You need to run commands on your server. Access via:

1. **Your Hosting Provider's Console:**
   - Login to your hosting provider website
   - Find "Console", "Shell", "Terminal", or "VNC" option
   - Click to open terminal

2. **Enable SSH** (ask your provider):
   - Share your SSH key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email`

#### Run These Commands on Server:

```bash
# Clone your repository
cd /var/www
git clone https://github.com/belgarathe/pactattack.git
cd pactattack/pactattack

# Create .env file
cp env.local.example .env
nano .env
# (Add your database password and Stripe keys)

# Install and deploy
npm install
npm run db:generate
npm run db:push
npm run build
pm2 start npm --name "pactattack" -- start
pm2 save

# Configure nginx
cat > /etc/nginx/sites-available/pactattack <<'EOF'
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
EOF

ln -s /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**Your site will be live at:** `http://82.165.66.236`

---

### Option 2: Use Deployment Script

I created `deploy-on-server.sh` script. On your server:

```bash
# Download the script from GitHub or create it manually
cd /var/www
git clone https://github.com/belgarathe/pactattack.git
cd pactattack/pactattack

# Make script executable and run
chmod +x deploy-on-server.sh
bash deploy-on-server.sh
```

---

### Option 3: Automatic Deployment (After Initial Setup)

Once you have SSH working, set up automatic deployment:

#### Step 1: Add GitHub Secrets

1. Go to: https://github.com/belgarathe/pactattack/settings/secrets/actions
2. Click "New repository secret"
3. Add these secrets:

**SERVER_HOST:**
```
82.165.66.236
```

**SERVER_USER:**
```
root
```

**SERVER_SSH_KEY:**
Get your private key on Windows:
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519
```
Copy the ENTIRE output (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

**SERVER_PORT:** (optional)
```
22
```

#### Step 2: Commit the Workflow

The GitHub Actions workflow is already created! Just commit it:

```powershell
cd F:\PA\pactattack
git add .github/workflows/deploy.yml
git commit -m "Add automatic deployment workflow"
git push
```

#### Step 3: Test It

After pushing:
- Go to: https://github.com/belgarathe/pactattack/actions
- You'll see the workflow run automatically
- Every time you push to `main`, it will auto-deploy!

---

## 📋 Deployment Checklist

### First Time Setup:
- [ ] Access server terminal (via provider console or SSH)
- [ ] Clone repository: `git clone https://github.com/belgarathe/pactattack.git /var/www/pactattack`
- [ ] Create `.env` file with database password and Stripe keys
- [ ] Run: `npm install`
- [ ] Run: `npm run db:generate`
- [ ] Run: `npm run db:push`
- [ ] Run: `npm run build`
- [ ] Start with PM2: `pm2 start npm --name "pactattack" -- start`
- [ ] Configure nginx
- [ ] Test: `http://82.165.66.236`

### For Updates (After Initial Setup):

**If using GitHub Actions:**
- Just push to GitHub! It auto-deploys.

**If manual:**
```bash
cd /var/www/pactattack/pactattack
git pull
npm install
npm run build
pm2 restart pactattack
```

---

## 🔧 .env File Template

Create `.env` file on server with:

```env
# Database (use password you saved earlier)
DATABASE_URL="postgresql://pactattack_user:YOUR_DB_PASSWORD@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="http://82.165.66.236"

# Stripe (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Pokemon TCG API
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
```

Generate NEXTAUTH_SECRET on server:
```bash
openssl rand -base64 32
```

---

## 🆘 Need Help Accessing Server?

**Common Hosting Providers:**

1. **Hetzner:**
   - Login → Cloud Console → Select Server → Console

2. **DigitalOcean:**
   - Login → Droplets → Select Droplet → Access → Launch Console

3. **AWS:**
   - EC2 → Instances → Select Instance → Connect → EC2 Instance Connect

4. **Contabo:**
   - Customer Panel → VPS → Console

5. **OVH:**
   - Manager → VPS → Console

**Or contact your hosting provider:**
> "I need to deploy my Node.js application. Can you:
> 1. Enable SSH access, OR
> 2. Provide web-based terminal access?
> 
> My SSH public key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email"

---

## ✅ Next Steps

1. **Access your server terminal** (most important!)
2. **Clone your repository**
3. **Follow the deployment steps**

**Your repository is ready at:** https://github.com/belgarathe/pactattack

Once you can access the server, deployment will take about 10-15 minutes!

---

## 📝 Quick Reference

**Repository:** https://github.com/belgarathe/pactattack  
**Server:** 82.165.66.236  
**App URL:** http://82.165.66.236 (after deployment)

**Deploy Script:** `deploy-on-server.sh`  
**GitHub Actions:** `.github/workflows/deploy.yml`

**Commands:**
```bash
# View logs
pm2 logs pactattack

# Restart app
pm2 restart pactattack

# Update app
cd /var/www/pactattack/pactattack && git pull && npm install && npm run build && pm2 restart pactattack
```

