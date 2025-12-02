#!/bin/bash
# nginx configuration script for PactAttack

set -e

echo "🔧 Configuring nginx for PactAttack..."

# Detect Linux distribution
if [ -f /etc/debian_version ]; then
    NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
    NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
    CONFIG_FILE="$NGINX_SITES_AVAILABLE/pactattack"
elif [ -f /etc/redhat-release ]; then
    NGINX_CONF_DIR="/etc/nginx/conf.d"
    CONFIG_FILE="$NGINX_CONF_DIR/pactattack.conf"
else
    echo "Unknown Linux distribution"
    exit 1
fi

# Create nginx configuration
cat > "$CONFIG_FILE" <<'EOF'
server {
    listen 80;
    server_name 82.165.66.236;

    # Increase body size for file uploads
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site (Debian/Ubuntu)
if [ -f /etc/debian_version ]; then
    if [ ! -L "$NGINX_SITES_ENABLED/pactattack" ]; then
        ln -s "$CONFIG_FILE" "$NGINX_SITES_ENABLED/pactattack"
    fi
fi

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

echo "✅ nginx configured successfully!"
echo "Configuration file: $CONFIG_FILE"

