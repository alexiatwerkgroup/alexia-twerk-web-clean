@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================
echo  TWERKHUB - Supabase deploy diagnostic
echo ========================================
echo.

echo [1/7] Working dir:
echo   %CD%
echo.

echo [2/7] Repairing git index (deleting corrupt index file)...
if exist .git\index (
  del /f /q .git\index
  echo   Index file deleted.
) else (
  echo   No index file to delete.
)
echo.

echo [3/7] Running git reset to rebuild index...
git reset
echo   Exit code: !errorlevel!
echo.

echo [4/7] Files changed since last commit:
git status --short
echo.

echo [5/7] Staging all changes...
git add -A
echo   Exit code: !errorlevel!
echo.

echo [6/7] Creating commit...
git commit -m "feat(supabase): full migration to Supabase Auth + global tokens + leaderboard"
echo   Exit code: !errorlevel!
echo.

echo [7/7] Pushing to origin/main...
git push origin main
echo   Exit code: !errorlevel!
echo.

echo ========================================
echo  DONE - presiona cualquier tecla para cerrar
echo ========================================
pause
