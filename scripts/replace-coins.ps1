# Replace diamondCoins with coins
$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'node_modules' }
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $content = $content -replace 'diamondCoins', 'coins'
    $content = $content -replace 'diamondCoinValue', 'coinValue'
    $content = $content -replace 'Diamond Coins', 'Coins'
    $content = $content -replace 'Diamond Coin', 'Coin'
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Output "Updated: $($file.Name)"
    }
}
