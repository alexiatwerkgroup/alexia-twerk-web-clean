@echo off
cd /d "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
echo Checking git status...
git status
echo.
echo Checking last commits...
git log --oneline -5
echo.
echo Showing remote URL...
git remote -v
echo.
echo Force pushing to main...
git push -f origin main
echo.
echo Done! Check the website to verify deployment.
pause
