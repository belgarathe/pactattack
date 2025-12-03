# PowerShell script to deploy PactAttack via GitHub download
# This script downloads and executes the deployment script on the server

$serverIP = "82.165.66.236"
$username = "root"
$password = "Lordamun1948kickboard"
$deployScriptUrl = "https://raw.githubusercontent.com/belgarathe/pactattack/main/pactattack/deploy-complete-secure.sh"

Write-Host "=========================================="
Write-Host "PactAttack Deployment via GitHub"
Write-Host "=========================================="
Write-Host ""

# Try to connect and execute deployment
Write-Host "Attempting to connect to server and deploy..."
Write-Host ""

# Method 1: Try with plink (if password auth works)
Write-Host "Method 1: Trying plink with password..."
$plinkCmd = "echo y | plink -ssh -pw $password $username@$serverIP `"cd /tmp && curl -fsSL $deployScriptUrl -o deploy-complete-secure.sh && chmod +x deploy-complete-secure.sh && bash deploy-complete-secure.sh`""
Write-Host "Command: $plinkCmd"
Write-Host ""

# Since direct execution may not work, provide manual instructions
Write-Host "=========================================="
Write-Host "MANUAL DEPLOYMENT INSTRUCTIONS"
Write-Host "=========================================="
Write-Host ""
Write-Host "Since SSH key authentication is required, please:"
Write-Host ""
Write-Host "OPTION 1: Via Plesk Git (Recommended)"
Write-Host "1. Go to Plesk → Git"
Write-Host "2. Add/Update repository: https://github.com/belgarathe/pactattack.git"
Write-Host "3. Set deployment actions to:"
Write-Host "   cd /var/www/pactattack/pactattack"
Write-Host "   npm install"
Write-Host "   npm run db:generate"
Write-Host "   npm run build"
Write-Host "   pm2 restart pactattack || pm2 start npm --name 'pactattack' -- start"
Write-Host "4. Click 'Pull' to deploy"
Write-Host ""
Write-Host "OPTION 2: Via SSH (if you can connect)"
Write-Host "Run this command on the server:"
Write-Host "   cd /tmp"
Write-Host "   curl -fsSL $deployScriptUrl -o deploy-complete-secure.sh"
Write-Host "   chmod +x deploy-complete-secure.sh"
Write-Host "   bash deploy-complete-secure.sh"
Write-Host ""
Write-Host "OPTION 3: Add SSH Key First"
Write-Host "1. Copy your public key:"
Write-Host "   Get-Content `$env:USERPROFILE\.ssh\id_rsa.pub"
Write-Host "2. Add it to server's authorized_keys:"
Write-Host "   ssh root@$serverIP 'mkdir -p ~/.ssh && echo YOUR_PUBLIC_KEY >> ~/.ssh/authorized_keys'"
Write-Host "3. Then run the deployment script"
Write-Host ""
Write-Host "=========================================="

