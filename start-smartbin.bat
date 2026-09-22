@echo off
title SmartBin Server
color 0A

echo.
echo ========================================
echo          SMARTBIN SYSTEM
echo ========================================
echo.

echo [1/2] Starting SmartBin Backend...
start "SmartBin Backend" cmd /k "cd /d C:\Users\user\OneDrive\Desktop\wep app\smartbin-backend && node server.js"

echo.
echo Waiting for Backend...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "C:\cloudflared\cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo ========================================
echo       SMARTBIN SYSTEM STARTED
echo ========================================
echo.
echo Backend:
echo http://localhost:3000
echo.
echo Cloudflare:
echo Check the Cloudflare Tunnel window
echo.
echo ========================================
echo.
echo Keep both windows open while using SmartBin.
echo.

pause
