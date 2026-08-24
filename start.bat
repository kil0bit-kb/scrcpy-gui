@echo off
REM Start ScrcpyGUI for temporary testing in development mode.
cd /d "%~dp0"

echo Starting ScrcpyGUI development server...
call npm run tauri dev
