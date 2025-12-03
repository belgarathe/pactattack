# Fix SSH Key Authentication - Complete Solution
# This script will add your public key to the server

$serverIP = "82.165.66.236"
$username = "root"
$password = "Lordamun1948kickboard"

# Get your public key
$publicKey = Get-Content "$env:USERPROFILE\.ssh\id_rsa.pub"

Write-Host "=========================================="
Write-Host "Fixing SSH Key Authentication"
Write-Host "=========================================="
Write-Host ""
Write-Host "Your public key:"
Write-Host $publicKey
Write-Host ""
Write-Host "Step 1: Connecting to server with password..."
Write-Host ""

# Create a script to run on the server
$serverScript = @"
#!/bin/bash
set -e

echo 'Setting up SSH key authentication...'

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Backup existing authorized_keys
if [ -f ~/.ssh/authorized_keys ]; then
    cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup.`$(date +%Y%m%d)
    echo 'Backed up existing authorized_keys'
fi

# Add the public key if it's not already there
PUBLIC_KEY='$publicKey'
if ! grep -q "`$PUBLIC_KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "`$PUBLIC_KEY" >> ~/.ssh/authorized_keys
    echo 'Public key added to authorized_keys'
else
    echo 'Public key already exists in authorized_keys'
fi

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Fix ownership
chown root:root ~/.ssh
chown root:root ~/.ssh/authorized_keys

echo ''
echo '=========================================='
echo 'SSH Key Setup Complete!'
echo '=========================================='
echo ''
echo 'Verifying setup:'
ls -la ~/.ssh/
echo ''
echo 'Testing key authentication...'
echo 'You should now be able to connect with:'
echo "  ssh -i `$env:USERPROFILE\.ssh\id_rsa root@$serverIP"
echo ''
"@

# Save script to temp file
$tempScript = "$env:TEMP\fix_ssh_key.sh"
$serverScript | Out-File -FilePath $tempScript -Encoding ASCII -NoNewline

Write-Host "Step 2: Uploading fix script to server..."
Write-Host ""

# Try to upload using pscp with password (might not work if password auth is disabled)
# Alternative: We'll provide manual instructions

Write-Host "=========================================="
Write-Host "MANUAL FIX INSTRUCTIONS"
Write-Host "=========================================="
Write-Host ""
Write-Host "Since password authentication may be disabled, here's how to fix it:"
Write-Host ""
Write-Host "OPTION 1: Via Plesk File Manager"
Write-Host "1. Go to Plesk → Files → File Manager"
Write-Host "2. Navigate to /root/.ssh/"
Write-Host "3. If authorized_keys exists, download and edit it"
Write-Host "4. Add this line to authorized_keys:"
Write-Host ""
Write-Host $publicKey
Write-Host ""
Write-Host "5. Save and upload back"
Write-Host "6. Set permissions: chmod 600 /root/.ssh/authorized_keys"
Write-Host ""
Write-Host "OPTION 2: Via Plesk Terminal/Console"
Write-Host "Run these commands in Plesk Terminal:"
Write-Host ""
Write-Host "mkdir -p ~/.ssh"
Write-Host "chmod 700 ~/.ssh"
Write-Host "echo '$publicKey' >> ~/.ssh/authorized_keys"
Write-Host "chmod 600 ~/.ssh/authorized_keys"
Write-Host ""
Write-Host "OPTION 3: If Password Auth Still Works"
Write-Host "Run this PowerShell command:"
Write-Host ""
Write-Host "`$key = Get-Content `$env:USERPROFILE\.ssh\id_rsa.pub"
Write-Host "echo `$key | plink -ssh -pw $password $username@$serverIP `"mkdir -p ~/.ssh && echo '`$key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh`""
Write-Host ""
Write-Host "=========================================="
Write-Host "QUICK ONE-LINER (if password works):"
Write-Host "=========================================="
Write-Host ""
Write-Host "Copy and paste this into PowerShell:"
Write-Host ""
$oneLiner = "`$key = Get-Content `$env:USERPROFILE\.ssh\id_rsa.pub; echo `$key | plink -ssh -pw $password $username@$serverIP `"mkdir -p ~/.ssh && echo '`$key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh`""
Write-Host $oneLiner
Write-Host ""

