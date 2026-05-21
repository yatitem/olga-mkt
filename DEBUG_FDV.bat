@echo off
echo.
echo  ==========================================
echo   DIAGNOSTIC PAS-A-PAS - FORCE DE VENTE
echo  ==========================================
echo.

echo  [ETAPE 1] Verification du dossier...
set "CURRENT_DIR=%~dp0"
echo  Dossier racine : %CURRENT_DIR%
pause

echo.
echo  [ETAPE 2] Deplacement vers le module commercial...
cd /d "%CURRENT_DIR%04_Modules_Terrain\olga-fdv"
if %errorlevel% neq 0 (
    echo  ❌ERREUR : Impossible d'acceder au dossier olga-fdv.
    pause
    exit
)
echo  Dossier actuel : %CD%
pause

echo.
echo  [ETAPE 3] Test de Node.js...
call node -v
if %errorlevel% neq 0 (
    echo  ❌ERREUR : Node.js n'est pas installe ou pas reconnu.
    pause
    exit
)
pause

echo.
echo  [ETAPE 4] Lancement de l'application...
echo  (Si ca bloque ici, dites-le moi)
npm run dev

echo.
echo  Le script est arrive a la fin.
pause
