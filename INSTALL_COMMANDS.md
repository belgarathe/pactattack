# Installation Commands for Ubuntu 22.04

## Copy and paste these commands one by one on your server:

### Step 1: Install Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version
```

**Expected output:** Should show Node.js v20.x.x and npm version

---

### Step 2: Install PostgreSQL

```bash
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
psql --version
```

**Expected output:** Should show PostgreSQL version

---

### Step 3: Create Database

```bash
# Generate a secure password
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Database password: $DB_PASS"
echo "Save this password!"

# Create database
sudo -u postgres psql <<EOF
CREATE DATABASE pactattack;
CREATE USER pactattack_user WITH PASSWORD '$DB_PASS';
ALTER DATABASE pactattack OWNER TO pactattack_user;
GRANT ALL PRIVILEGES ON DATABASE pactattack TO pactattack_user;
\q
EOF

# Test connection
echo "Testing database connection..."
psql -U pactattack_user -d pactattack -h localhost -c "SELECT version();"
```

**⚠️ IMPORTANT:** Copy the database password shown!

---

### Step 4: Install PM2

```bash
npm install -g pm2
pm2 --version
pm2 startup systemd -u root --hp /root
```

**Expected output:** Should show PM2 version

---

### Step 5: Check nginx (Plesk may have it)

```bash
nginx -v
```

If it says "command not found", install it:
```bash
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx
```

---

## Verify Everything is Installed

Run this to check:

```bash
echo "=== Installation Check ==="
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "npm: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "PostgreSQL: $(psql --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "nginx: $(nginx -v 2>&1 || echo 'NOT INSTALLED')"
echo "========================"
```

---

## Quick Install Script (All at Once)

Or run this single command to install everything:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/nodesource/distributions/master/deb/setup_20.x)" && \
apt-get install -y nodejs postgresql postgresql-contrib && \
npm install -g pm2 && \
systemctl start postgresql && \
systemctl enable postgresql && \
echo "✅ Base installations complete!"
```

---

## If You Get Errors

### Error: "Unable to locate package"
```bash
apt-get update
# Then try again
```

### Error: "Permission denied"
```bash
# Make sure you're running as root
whoami
# Should show "root"
```

### Error: "curl: command not found"
```bash
apt-get install -y curl
# Then try again
```

### Error: PostgreSQL won't start
```bash
systemctl status postgresql
journalctl -u postgresql -n 50
# Share the error output
```

---

## After Installation

You'll need:

1. **Database URL** (from Step 3)
   ```
   postgresql://pactattack_user:YOUR_PASSWORD@localhost:5432/pactattack
   ```

2. **Upload your application** to `/var/www/pactattack`

3. **Create .env file** with database URL and other variables

4. **Build and start** your application

