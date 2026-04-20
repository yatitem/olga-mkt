# OLGA — Robot de Sauvegarde Supabase (v1.2 PS)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$SUPA_URL = "https://hndsnoindoixrigcbivd.supabase.co/rest/v1"
$SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q"

$TABLES = @(
    "users", "clients", "olga_products", "orders", "objectifs", 
    "vehicles", "payments", "visits", "announcements", 
    "competitor_prices", "promotions", "logs", "loading_slips"
)

$BACKUP_ROOT = "E:\ANTIGRAVITY\OLGA_BACKUPS_DATABASE"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupDir = Join-Path $BACKUP_ROOT $timestamp

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Host "STARTING SUPABASE BACKUP"
Write-Host "----------------------------------------"

$headers = @{
    "apikey" = $SUPA_KEY
    "Authorization" = "Bearer $SUPA_KEY"
}

foreach ($table in $TABLES) {
    Write-Host "Extracting : $table... " -NoNewline
    $uri = "$SUPA_URL/$table?select=*"
    
    try {
        $data = Invoke-RestMethod -Uri $uri -Headers $headers -ErrorAction Stop -Verbose
        if ($null -ne $data) {
            $jsonPath = Join-Path $backupDir "$table.json"
            $data | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding utf8
            
            # Calcul du nombre de lignes de façon compatible
            if ($data.Count -ne $null) {
                $count = $data.Count
            } else {
                $count = 1
            }
            
            Write-Host "[OK] ($($count) lines)" -ForegroundColor Green
        } else {
            Write-Host "[EMPTY]" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

Write-Host "----------------------------------------"
Write-Host "BACKUP COMPLETED"
Write-Host "FOLDER: $backupDir"
