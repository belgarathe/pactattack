#!/bin/bash
# Script to prepare server - run this if you can access server terminal

echo "🔧 Preparing server for deployment..."

# Create directory structure
mkdir -p /var/www/pactattack/pactattack
cd /var/www/pactattack/pactattack

# Create necessary directories
mkdir -p src/app src/components src/lib src/hooks src/types
mkdir -p prisma public
mkdir -p scripts tests

# Set permissions
chown -R root:root /var/www/pactattack
chmod -R 755 /var/www/pactattack

echo "✅ Directory structure created at /var/www/pactattack/pactattack"
echo ""
echo "Next: Upload your files to this location"
echo "Or use Git to clone your repository here"

