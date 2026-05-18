@echo off
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "RESTORE-PLAYLISTS.ps1"
pause
