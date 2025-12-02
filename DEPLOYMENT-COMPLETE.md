# Complete Deployment Guide for belgarathe/pactattack

## 🎯 Your Setup
- **GitHub Username:** belgarathe
- **Repository:** https://github.com/belgarathe/pactattack
- **Server IP:** 82.165.66.236
- **Cursor:** Connected to GitHub ✅

## 🚀 Deployment Methods

### Method 1: Manual Deployment (Recommended First Time)

#### Step 1: Access Server Terminal

You need to access your server. Try:

**A. Hosting Provider Console:**
- Login to your hosting provider's website
- Look for "Console", "Shell", "Terminal", or "VNC"

**B. Enable SSH:**
- Contact your hosting provider
- Ask them to add your SSH key
- Your SSH key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email`

#### Step 2: Clone Repository

```bash
cd /var/www
git clone https://github.com/belgarathe/pactattack.git
cd pactattack/pactattack
```

#### Step 3: Configure Environment

```bash
cp env.local.example .env
nano .env
```

Add:
```env
DATABASE_URL="postgresql://pactattack_user:YOUR_DB_PASSWORD@localhost:5432/pactattack"
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://82.165.66.236"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
```

#### Step 4: Install & Deploy

```bash
npm install
npm run db:generate
npm run db:push
npm run build
pm2 start npm --name "pactattack" -- start
pm2 save
```

#### Step 5: Configure nginx

```bash
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

---

### Method 2: Automatic Deployment via GitHub Actions

Once you have SSH access working, set up automatic deployment:

#### Step 1: Add GitHub Secrets

Go to: https://github.com/belgarathe/pactattack/settings/secrets/actions

Click "New repository secret" and add:

1. **SERVER_HOST:** `82.165.66.236`
2. **SERVER_USER:** `root`
3. **SERVER_SSH_KEY:** (Your private SSH key content)
4. **SERVER_PORT:** `22` (optional)

#### Step 2: Get Your Private SSH Key

On your Windows machine:

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519
```

Copy the ENTIRE output (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

#### Step 3: Push the Workflow

The workflow file is already created. Just commit and push:

```powershell
cd F:\PA\pactattack
git add .github/workflows/deploy.yml
git commit -m "Add deployment workflow"
git push
```

#### Step 4: Test Deployment

After pushing, go to:
- https://github.com/belgarathe/pactattack/actions

You'll see the workflow run automatically!

---

### Method 3: Deploy Script on Server

Create a deploy script on your server:

```bash
# On server, create deploy script
nano /root/deploy.sh
```

Paste:
```bash
#!/bin/bash
cd /var/www/pactattack/pactattack
git pull origin main
npm install
npm run db:generate
npm run db:push
npm run build
pm2 restart pactattack
echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x /root/deploy.sh
```

Then you can deploy with:
```bash
/root/deploy.sh
```

---

## 📋 Complete Deployment Checklist

### Initial Setup (One Time)

- [ ] Access server terminal (via provider console or SSH)
- [ ] Clone repository: `git clone https://github.com/belgarathe/pactattack.git /var/www/pactattack`
- [ ] Navigate: `cd /var/www/pactattack/pactattack`
- [ ] Create `.env` file with all variables
- [ ] Run: `npm install`
- [ ] Run: `npm run db:generate`
- [ ] Run: `npm run db:push`
- [ ] Run: `npm run build`
- [ ] Start with PM2: `pm2 start npm --name "pactattack" -- start`
- [ ] Configure nginx (see Step 5 above)
- [ ] Test: `http://82.165.66.236`

### Ongoing Updates

After initial setup, to update:

```bash
cd /var/www/pactattack/pactattack
git pull
npm install
npm run build
pm2 restart pactattack
```

Or if GitHub Actions is set up, just push to GitHub!

---

## 🔧 Troubleshooting

### Can't Access Server?

1. **Check hosting provider console:**
   - Login to provider's website
   - Look for server management
   - Find "Console", "Terminal", or "Shell" option

2. **Contact hosting provider:**
   - Ask them to enable SSH
   - Or provide web-based terminal access
   - Give them your SSH public key

3. **Common Providers:**
   - **Hetzner:** Cloud Console → Server → Console
   - **DigitalOcean:** Droplets → Access → Console
   - **AWS:** EC2 → Connect → EC2 Instance Connect
   - **Contabo:** Customer Panel → VPS → Console

### GitHub Actions Not Working?

- Make sure all secrets are set correctly
- Check SSH key format (should include BEGIN/END lines)
- Verify server host/port are correct
- Check Actions tab for error messages

---

## 🎯 Next Steps

1. **Access your server terminal** (most important!)
2. **Clone the repository**
3. **Follow the deployment steps**

Once you can access the server, deployment will take about 10-15 minutes!

**Which method do you want to use?** Let me know when you can access the server terminal! 🚀

