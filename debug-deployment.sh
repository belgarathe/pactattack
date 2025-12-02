#!/bin/bash
# Debug script to check server status

echo "🔍 Checking server status..."
echo ""

# Check OS
echo "=== OS Information ==="
if [ -f /etc/os-release ]; then
    cat /etc/os-release | grep -E "^(NAME|VERSION)="
else
    echo "Unknown OS"
fi
echo ""

# Check Node.js
echo "=== Node.js ==="
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node --version)"
    echo "   npm version: $(npm --version)"
else
    echo "❌ Node.js NOT installed"
fi
echo ""

# Check PostgreSQL
echo "=== PostgreSQL ==="
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL installed: $(psql --version)"
    if systemctl is-active --quiet postgresql; then
        echo "✅ PostgreSQL service is running"
    else
        echo "❌ PostgreSQL service is NOT running"
    fi
else
    echo "❌ PostgreSQL NOT installed"
fi
echo ""

# Check PM2
echo "=== PM2 ==="
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 installed: $(pm2 --version)"
    pm2 list
else
    echo "❌ PM2 NOT installed"
fi
echo ""

# Check nginx
echo "=== nginx ==="
if command -v nginx &> /dev/null; then
    echo "✅ nginx installed: $(nginx -v 2>&1)"
    if systemctl is-active --quiet nginx; then
        echo "✅ nginx service is running"
    else
        echo "❌ nginx service is NOT running"
    fi
else
    echo "❌ nginx NOT installed"
fi
echo ""

# Check application directory
echo "=== Application Directory ==="
if [ -d "/var/www/pactattack" ]; then
    echo "✅ Directory exists: /var/www/pactattack"
    ls -la /var/www/pactattack | head -10
else
    echo "❌ Directory does NOT exist: /var/www/pactattack"
fi
echo ""

# Check ports
echo "=== Port Status ==="
echo "Port 3000 (Next.js):"
netstat -tulpn 2>/dev/null | grep :3000 || echo "  Not in use"
echo "Port 80 (HTTP):"
netstat -tulpn 2>/dev/null | grep :80 || echo "  Not in use"
echo "Port 5432 (PostgreSQL):"
netstat -tulpn 2>/dev/null | grep :5432 || echo "  Not in use"
echo ""

# Check disk space
echo "=== Disk Space ==="
df -h / | tail -1
echo ""

# Check memory
echo "=== Memory ==="
free -h
echo ""

echo "✅ Debug check complete!"

