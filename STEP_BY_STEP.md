# Step-by-Step Deployment (Troubleshooting Guide)

## First: Check What's Already Installed

Connect to your server and run:

```bash
ssh root@82.165.66.236

# Upload and run debug script
# (Or run these commands manually)
```

### Manual Check Commands:

```bash
# Check OS
cat /etc/os-release

# Check Node.js
node --version
npm --version

# Check PostgreSQL
psql --version
systemctl status postgresql

# Check if PM2 exists
pm2 --version

# Check if nginx exists
nginx -v
systemctl status nginx

# Check if app directory exists
ls -la /var/www/pactattack
```

## Step 1: Update System (Manual)

### For Ubuntu/Debian:
```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git build-essential python3
```

### For CentOS/Rocky/RHEL:
```bash
yum update -y
yum install -y curl wget git gcc gcc-c++ make python3
```

**If this fails, tell me the error message.**

## Step 2: Install Node.js (Manual)

```bash
# Remove old Node.js if exists
apt-get remove nodejs -y 2>/dev/null || yum remove nodejs -y 2>/dev/null || true

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node --version
npm --version
```

**If this fails:**
- Check internet connection: `ping google.com`
- Check if curl works: `curl --version`
- Share the error message

## Step 3: Install PostgreSQL (Manual)

### Ubuntu/Debian:
```bash
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql
```

### CentOS/Rocky:
```bash
yum install -y postgresql-server postgresql-contrib
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql
```

**If this fails, share the error.**

## Step 4: Create Database (Manual)

```bash
# Switch to postgres user
sudo -u postgres psql

# In psql, run these commands:
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD 'YourSecurePassword123!';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
```

**Test connection:**
```bash
psql -U pactattack_user -d pactattack -h localhost
# Enter password when prompted
```

## Step 5: Install PM2 (Manual)

```bash
npm install -g pm2
pm2 --version
pm2 startup systemd -u root --hp /root
```

## Step 6: Install nginx (Manual)

### Ubuntu/Debian:
```bash
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

### CentOS/Rocky:
```bash
yum install -y nginx
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

**Test nginx:**
```bash
curl http://localhost
# Should show nginx welcome page
```

## Step 7: Upload Your Application

### From your Windows machine (PowerShell):

```powershell
# Make sure you're in the right directory
cd F:\PA

# Upload the folder
scp -r pactattack root@82.165.66.236:/var/www/
```

**If SCP fails:**
- Check SSH connection: `ssh root@82.165.66.236`
- Try using WinSCP (GUI tool)
- Or use SFTP client

## Step 8: Configure Environment

On server:
```bash
cd /var/www/pactattack/pactattack
cp env.local.example .env
nano .env
```

Add:
```env
DATABASE_URL="postgresql://pactattack_user:YourSecurePassword123!@localhost:5432/pactattack"
NEXTAUTH_URL="http://82.165.66.236"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://82.165.66.236"
```

## Step 9: Install Dependencies

```bash
cd /var/www/pactattack/pactattack
npm install
```

**If npm install fails:**
- Check Node.js version: `node --version` (should be v20.x)
- Check disk space: `df -h`
- Check npm version: `npm --version`
- Share the error message

## Step 10: Setup Database

```bash
npm run db:generate
npm run db:push
```

**If this fails:**
- Check DATABASE_URL in .env
- Test database connection: `psql -U pactattack_user -d pactattack`
- Check PostgreSQL is running: `systemctl status postgresql`

## Step 11: Build Application

```bash
npm run build
```

**If build fails:**
- Check for TypeScript errors
- Check disk space: `df -h`
- Check memory: `free -h`
- Share the error message

## Step 12: Configure nginx

```bash
nano /etc/nginx/sites-available/pactattack
```

Add:
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

Enable:
```bash
ln -s /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Step 13: Start Application

```bash
cd /var/www/pactattack/pactattack
pm2 start npm --name "pactattack" -- start
pm2 save
pm2 status
pm2 logs pactattack
```

## Common Issues & Solutions

### Issue: "Permission denied"
```bash
chmod +x deploy-full.sh
# Or run commands with sudo
```

### Issue: "Command not found"
- Check if package is installed
- Check PATH: `echo $PATH`
- Try full path: `/usr/bin/node --version`

### Issue: "Port already in use"
```bash
# Find what's using port 3000
netstat -tulpn | grep 3000
# Kill the process
kill -9 <PID>
```

### Issue: "Database connection failed"
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection
psql -U pactattack_user -d pactattack

# Check .env file
cat .env | grep DATABASE_URL
```

### Issue: "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Try with verbose output
npm install --verbose

# Check Node.js version (needs 18+)
node --version
```

## Get Help

Run this and share the output:
```bash
# System info
uname -a
cat /etc/os-release

# Installed versions
node --version 2>/dev/null || echo "Node.js not installed"
npm --version 2>/dev/null || echo "npm not installed"
psql --version 2>/dev/null || echo "PostgreSQL not installed"
pm2 --version 2>/dev/null || echo "PM2 not installed"
nginx -v 2>/dev/null || echo "nginx not installed"

# Services status
systemctl status postgresql
systemctl status nginx
```

