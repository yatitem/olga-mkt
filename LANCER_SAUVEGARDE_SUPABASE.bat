@echo off
chcp 65001 >nul
echo.
echo  ╔════════════════════════════════════════╗
echo  ║   OLGA — Sauvegarde Supabase Locale   ║
echo  ╚════════════════════════════════════════╝
echo.
echo  Démarrage de l'extraction des données Cloud...
echo.

set "SUPA_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q"
set "TABLES=users clients olga_products orders objectifs vehicles payments visits announcements competitor_prices promotions logs loading_slips"

:: Création du dossier horodaté de façon robuste
set "TAG=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%"
set "TAG=%TAG: =0%"
set "DEST=E:\ANTIGRAVITY\OLGA_BACKUPS_DATABASE\%TAG%"

if not exist "%DEST%" mkdir "%DEST%"

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $h = @{ 'apikey' = '%SUPA_KEY%'; 'Authorization' = 'Bearer %SUPA_KEY%' }; foreach ($t in '%TABLES%'.Split(' ')) { Write-Host \" >> Exporting $t... \"; try { $d = Invoke-RestMethod -Uri \"https://hndsnoindoixrigcbivd.supabase.co/rest/v1/$($t)?select=*\" -Headers $h -ErrorAction Stop; if ($null -ne $d) { $d | ConvertTo-Json -Depth 10 | Set-Content -Path \"%DEST%\$($t).json\" } } catch { Write-Host \" [ERREUR] $($_.Exception.Message)\" -ForegroundColor Red } }"

echo.
echo  ====================================
echo  Opération de sauvegarde terminée.
echo  Destination : %DEST%
echo  ====================================
echo.
pause
