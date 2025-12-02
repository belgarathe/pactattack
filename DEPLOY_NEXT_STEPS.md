# Next Steps: Deploy Your Application

## ✅ What's Done
- Node.js installed
- PostgreSQL installed
- Database created
- PM2 installed
- nginx installed

## 📋 What's Next

### Step 1: Upload Your Application Files

**From your Windows machine (PowerShell):**

```powershell
# Navigate to your project folder
cd F:\PA

# Upload the entire pactattack folder to server
scp -r pactattack root@82.165.66.236:/var/www/
```

**Alternative: Use WinSCP or FileZilla** (GUI tools)

After uploading, on the server verify:
```bash
ls -la /var/www/pactattack
# Should show your files
```

---

### Step 2: Create Application Directory Structure

On your server:

```bash
# Create the directory
mkdir -p /var/www/pactattack

# Set permissions
chmod 755 /var/www/pactattack
```

**If you uploaded via SCP, skip this - the directory already exists!**

---

### Step 3: Navigate to Application Folder

```bash
cd /var/www/pactattack/pactattack
ls -la
# Should show: package.json, src/, prisma/, etc.
```

---

### Step 4: Create .env File

```bash
cd /var/www/pactattack/pactattack

# Copy example file
cp env.local.example .env

# Edit the file
nano .env
```

**Add these variables** (use the database password you saved earlier):

```env
# Database (use the password from installation)
DATABASE_URL="postgresql://pactattack_user:YOUR_PASSWORD_HERE@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="generate-with-command-below"

# Stripe (get from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://82.165.66.236"

# Pokemon TCG API (optional)
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and paste it as `NEXTAUTH_SECRET` value.

**Save and exit nano:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 5: Install Node.js Dependencies

```bash
cd /var/www/pactattack/pactattack
npm install
```

**This may take 2-5 minutes. Wait for it to finish!**

---

### Step 6: Setup Database (Prisma)

```bash
# Generate Prisma Client
npm run db:generate

# Push database schema
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

---

### Step 7: Build the Application

```bash
npm run build
```

**This may take 2-3 minutes. Wait for it to finish!**

---

### Step 8: Start Application with PM2

```bash
pm2 start npm --name "pactattack" -- start
pm2 save
pm2 startup
```

**Check if it's running:**
```bash
pm2 status
pm2 logs pactattack
```

**If you see errors, check the logs:**
```bash
pm2 logs pactattack --lines 50
```

---

### Step 9: Configure nginx

```bash
# Create nginx config file
nano /etc/nginx/sites-available/pactattack
```

**Paste this configuration:**

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

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Enable the site:**
```bash
ln -s /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

---

### Step 10: Test Your Application

```bash
# Check if app is running on port 3000
curl http://localhost:3000

# Check PM2 status
pm2 status

# View logs
pm2 logs pactattack
```

**Open in browser:** `http://82.165.66.236`

---

## 🔧 Troubleshooting

### App won't start?

```bash
# Check logs
pm2 logs pactattack

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Restart app
pm2 restart pactattack
```

### Database connection error?

```bash
# Test database connection
psql -U pactattack_user -d pactattack -h localhost

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

### nginx not working?

```bash
# Check nginx status
systemctl status nginx

# Check error logs
tail -f /var/log/nginx/error.log

# Test nginx config
nginx -t
```

### Build fails?

```bash
# Check for errors
npm run build

# Check disk space
df -h

# Clear and rebuild
rm -rf .next
npm run build
```

---

## 📝 Quick Command Reference

```bash
# View application logs
pm2 logs pactattack

# Restart application
pm2 restart pactattack

# Stop application
pm2 stop pactattack

# View application status
pm2 status

# Check if running on port 3000
netstat -tulpn | grep 3000

# Test database
psql -U pactattack_user -d pactattack

# Reload nginx
systemctl reload nginx
```

---

## ✅ Deployment Checklist

- [ ] Files uploaded to server
- [ ] .env file created with all variables
- [ ] npm install completed
- [ ] Database setup (db:generate, db:push)
- [ ] Application built (npm run build)
- [ ] Application started with PM2
- [ ] nginx configured
- [ ] Site accessible in browser

---

## 🎉 After Deployment

Your application should be running at: `http://82.165.66.236`

Next optional steps:
- Set up SSL certificate (requires domain name)
- Configure firewall
- Set up monitoring
- Configure backups

