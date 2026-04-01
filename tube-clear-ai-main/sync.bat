@echo off
echo ================================
echo TubeClear Git Sync
echo ================================
echo.

git add .
echo [1/3] Files staged...

git commit -m "Update: %date% %time:~0,5%"
echo [2/3] Changes committed...

git push origin main
echo [3/3] Pushed to GitHub!

echo.
echo ================================
echo Sync Complete!
echo ================================
pause
