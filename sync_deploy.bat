@echo off
chcp 65001 >nul
echo.
echo  ╔════════════════════════════════════════╗
echo  ║   OLGA — Sync vers NETLIFY_DEPLOY     ║
echo  ╚════════════════════════════════════════╝
echo.

set SRC=E:\ANTIGRAVITY\OLGA MKT
set DST=E:\ANTIGRAVITY\OLGA_NETLIFY_DEPLOY

if not exist "%DST%" mkdir "%DST%"

echo  [1/2] Nettoyage du dossier de déploiement...
powershell -Command "Remove-Item -Path '%DST%\*' -Recurse -Force -ErrorAction SilentlyContinue"

echo  [2/2] Synchronisation des modules...

:: On copie les dossiers essentiels en preservant la structure
set MODULES=00_Portal 01_Core 02_Database 03_Modules_Admin 04_Modules_Terrain 05_Modules_Strategie 06_Logistique

for %%m in (%MODULES%) do (
    if exist "%SRC%\%%m" (
        echo  -- Copie de %%m...
        xcopy "%SRC%\%%m" "%DST%\%%m\" /E /I /Y /Q >nul
    )
)

:: Copie des fichiers racine
copy /Y "%SRC%\index.html" "%DST%\index.html" >nul

echo.
echo  ====================================
echo  Sync terminé !
echo  Dépôt : %DST%
echo  ====================================
echo.
echo  Prochaine étape :
echo  Glisser le dossier OLGA_NETLIFY_DEPLOY sur app.netlify.com/drop
echo.
pause
