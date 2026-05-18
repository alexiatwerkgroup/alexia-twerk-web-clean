@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo   RESTAURACION DE PLAYLISTS DESDE BACKUP V6.0
echo ============================================================
echo.

python.exe full_restore.py

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
