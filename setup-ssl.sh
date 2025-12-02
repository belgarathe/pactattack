#!/bin/bash
# SSL setup script with Let's Encrypt

set -e

echo "🔒 Setting up SSL certificate..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    fi
fi

# Check if domain is provided
if [ -z "$1" ]; then
    echo "⚠️  No domain provided. SSL setup requires a domain name."
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    echo ""
    echo "For IP-based access, you'll need to:"
    echo "1. Set up a domain name pointing to 82.165.66.236"
    echo "2. Run: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo "Setting up SSL for domain: $DOMAIN"

# Update nginx config to include domain
if [ -f /etc/debian_version ]; then
    CONFIG_FILE="/etc/nginx/sites-available/pactattack"
elif [ -f /etc/redhat-release ]; then
    CONFIG_FILE="/etc/nginx/conf.d/pactattack.conf"
fi

# Update server_name in config
sed -i "s/server_name 82.165.66.236;/server_name $DOMAIN 82.165.66.236;/" "$CONFIG_FILE"
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email tim@meggert.email

# Test auto-renewal
certbot renew --dry-run

echo "✅ SSL certificate installed successfully!"
echo "Your site should now be accessible at: https://$DOMAIN"

