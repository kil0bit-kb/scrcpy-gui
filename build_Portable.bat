@echo off
REM Build ScrcpyGUI and generate a Windows executable bundle.
cd /d "%~dp0"

echo Installing npm dependencies...
call npm install
if errorlevel 1 exit /b %errorlevel%

echo Building the application with Tauri...
call npm run tauri build
if errorlevel 1 exit /b %errorlevel%

echo Build complete.
echo Output bundle should be available under src-tauri\target\release\bundle\windows
pause
