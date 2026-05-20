@echo off
cd /d "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
echo ============================================
echo Deploying new modal to production
echo ============================================
echo.
echo Git status before commit...
git status
echo.
echo Adding modal file...
git add assets/twerkhub-checkout-modal.js
echo.
echo Committing...
git commit -m "Replace old modal with new 4-tier professional 'Alexia Premium' modal"
echo.
echo Pushing to main...
git push origin main
echo.
echo ============================================
echo DEPLOYMENT COMPLETE!
echo Check https://alexiatwerkgroup.com/membership
echo ============================================
pause
