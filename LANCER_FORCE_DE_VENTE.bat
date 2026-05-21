@echo off
title DIAGNOSTIC OLGA - FORCE DE VENTE
chcp 65001 >nul
echo.
echo  🔍 DIAGNOSTIC ET LANCEMENT...
echo  ----------------------------------------------
echo.

:: Vérification Node.js
echo  [1/3] Vérification de l'environnement...
call node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ Erreur : Node.js n'est pas détecté. 
    echo  Veuillez l'installer sur https://nodejs.org/
    pause
    exit
)
echo  ✅ Node.js est présent.

:: Dossier
set "target_dir=e:\ANTIGRAVITY\OLGA MKT\04_Modules_Terrain\olga-fdv"
cd /d "%target_dir%"

:: Nettoyage/Install
echo  [2/3] Vérification des modules...
if not exist "node_modules" (
    echo  ⏳ Installation des dépendances...
    call npm install
)

:: Lancement
echo  [3/3] Démarrage du serveur...
echo.
echo  --------------------------------------------------
echo  Garder cette fenêtre OUVERTE pour utiliser l'app.
echo  L'URL devrait être : http://localhost:5173
echo  --------------------------------------------------
echo.

:: Ouvre le lien après 3 secondes
start "" "http://localhost:5173"

:: Lance Vite avec l'option --host pour être sûr d'être accessible
call npx vite --host --port 5173

echo.
echo  Le serveur s'est arrêté.
pause
