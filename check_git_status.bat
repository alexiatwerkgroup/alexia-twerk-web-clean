@echo off
setlocal enabledelayedexpansion
cd /d "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

(
echo ============================================
echo GIT STATUS CHECK
echo ============================================
echo.
echo Current directory:
cd
echo.
echo Git Status:
git status
echo.
echo Last 5 commits:
git log --oneline -5
echo.
echo Remote branches:
git branch -r
echo.
echo Checking assets/twerkhub-checkout-modal.js:
git log --oneline -1 -- assets/twerkhub-checkout-modal.js
echo.
) > git_status_report.txt 2>&1

echo Report saved to git_status_report.txt
pause
