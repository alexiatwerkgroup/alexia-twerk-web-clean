@echo off
cd /d "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
echo Fixing UTF-8 BOM encoding...
python fix_encoding.py
echo Running git commands...
git add index.html
git commit -m "Update modal design - new 4-tier professional subscription modal with Discord and Telegram buttons"
git push
echo Done!
pause
