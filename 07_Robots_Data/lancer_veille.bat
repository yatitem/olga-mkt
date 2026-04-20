@echo off
echo ==================================================
echo   ROBOT DE VEILLE CONCURRENTIELLE - OLGA 2026
echo ==================================================
echo.
echo [DATE] %DATE% %TIME%
echo [INFO] Verification des donnees concurrents...
python "e:\ANTIGRAVITY\OLGA MKT\robot_veille.py"
echo.
echo [SUCCES] Le Dashboard a ete mis a jour avec les dernieres donnees du marche.
echo.
pause
