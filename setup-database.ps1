# Run this script as Administrator to set up the database
# Right-click PowerShell and select "Run as Administrator"

Write-Host "=== PactAttack Database Setup ===" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path "$path\psql.exe") {
        $psqlPath = $path
        Write-Host "Found PostgreSQL at: $path" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "ERROR: PostgreSQL not found!" -ForegroundColor Red
    exit 1
}

# Update pg_hba.conf for trust authentication
$dataDirs = @(
    "C:\Program Files\PostgreSQL\17\data",
    "C:\Program Files\PostgreSQL\16\data",
    "C:\Program Files\PostgreSQL\15\data"
)

$pgHbaPath = $null
foreach ($dir in $dataDirs) {
    if (Test-Path "$dir\pg_hba.conf") {
        $pgHbaPath = "$dir\pg_hba.conf"
        Write-Host "Found pg_hba.conf at: $pgHbaPath" -ForegroundColor Green
        break
    }
}

if ($pgHbaPath) {
    Write-Host "Updating pg_hba.conf for localhost trust..." -ForegroundColor Yellow
    $content = Get-Content $pgHbaPath
    $hasTrust = $false
    foreach ($line in $content) {
        if ($line -match "127\.0\.0\.1/32.*trust") {
            $hasTrust = $true
            break
        }
    }
    
    if (-not $hasTrust) {
        $newContent = @()
        $added = $false
        foreach ($line in $content) {
            if ($line -match "^# IPv4 local connections" -and -not $added) {
                $newContent += $line
                $newContent += "host    all             all             127.0.0.1/32            trust"
                $added = $true
            } else {
                $newContent += $line
            }
        }
        $newContent | Set-Content $pgHbaPath -Encoding UTF8
        Write-Host "pg_hba.conf updated!" -ForegroundColor Green
    } else {
        Write-Host "Trust rule already exists in pg_hba.conf" -ForegroundColor Green
    }
}

# Find and restart PostgreSQL service
$services = Get-Service | Where-Object { $_.DisplayName -like "*PostgreSQL*" }
if ($services) {
    $service = $services[0]
    Write-Host "Found PostgreSQL service: $($service.Name)" -ForegroundColor Green
    Write-Host "Restarting service..." -ForegroundColor Yellow
    Restart-Service -Name $service.Name -Force
    Start-Sleep -Seconds 5
    Write-Host "Service restarted!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not find PostgreSQL service" -ForegroundColor Yellow
}

# Try to create database
Write-Host "`nCreating database 'pactattack'..." -ForegroundColor Yellow
$env:PGPASSWORD = ""
$result = & "$psqlPath\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE pactattack;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Database 'pactattack' created!" -ForegroundColor Green
} else {
    Write-Host "Database creation result: $result" -ForegroundColor Yellow
    Write-Host "`nIf database creation failed, you can:" -ForegroundColor Cyan
    Write-Host "1. Open pgAdmin and create database manually" -ForegroundColor White
    Write-Host "2. Or run: psql -U postgres -c 'CREATE DATABASE pactattack;'" -ForegroundColor White
    Write-Host "   (You may need to enter the PostgreSQL password)" -ForegroundColor White
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env file with correct DATABASE_URL" -ForegroundColor White
Write-Host "2. Run: npm run db:push" -ForegroundColor White
Write-Host "3. Run: npm run db:seed" -ForegroundColor White




