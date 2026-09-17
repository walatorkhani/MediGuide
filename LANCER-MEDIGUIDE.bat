@echo off
title MediGuide
echo.
echo ==========================================
echo          MEDIGUIDE - DEMARRAGE
echo ==========================================
echo.
echo 1. Verifiez PostgreSQL et la base mediguide
echo 2. Le Redis est optionnel en developpement
echo 3. Configurez SMTP pour recevoir les codes email
echo.
start "MediGuide Backend" cmd /k "cd /d %~dp0backend && npm install && npm run dev"
timeout /t 3 /nobreak >nul
start "MediGuide Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
start http://localhost:5173
