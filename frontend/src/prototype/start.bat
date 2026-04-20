@echo off
title Social Tennis Dev Server
cd /d "%~dp0client"
echo Starting Social Tennis...
start "Social Tennis" cmd /k npm run dev
timeout /t 3 /nobreak > nul
start http://localhost:5173
