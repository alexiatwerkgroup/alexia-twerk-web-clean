@echo off
cd /d "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
echo Current directory: %CD%
echo.
echo Checking git status...
git status
echo.
echo Last 3 commits:
git log --oneline -3
echo.
echo Staging the modal file...
git add assets/twerkhub-checkout-modal.js
echo.
echo Committing...
git commit -m "Update to new Alexia Premium 4-tier modal" || echo No changes to commit
echo.
echo Force pushing to main...
git push -f origin main
echo.
echo Done!
pause
