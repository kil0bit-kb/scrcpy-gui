@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM ─────────────────────────────────────────────────────────────────────────────
REM  ScrcpyGUI — Windows build script
REM  Requires: Node.js, npm, Rust (rustup), Tauri CLI (installed via npm)
REM  Usage: double-click this file, or run it from any terminal.
REM ─────────────────────────────────────────────────────────────────────────────

REM ── 1. Inject Cargo into PATH for this session ───────────────────────────────
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" (
    set "PATH=%CARGO_BIN%;%PATH%"
) else (
    echo.
    echo  ERROR: Rust ^(cargo.exe^) was not found.
    echo         Expected location: %CARGO_BIN%
    echo         Install Rust from: https://rustup.rs
    echo         After installing, re-run this script.
    echo.
    pause
    exit /b 1
)

REM ── 2. Verify required tools are reachable ───────────────────────────────────
echo Checking prerequisites...
for %%T in (node npm cargo) do (
    where %%T >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] %%T not found in PATH.
        echo          Install %%T and restart your terminal, then re-run this script.
        pause
        exit /b 1
    )
    echo   [OK]   %%T
)

REM ── 3. Install npm dependencies ──────────────────────────────────────────────
echo.
echo npm install...
call npm install
if !ERRORLEVEL! neq 0 (
    echo.
    echo  ERROR: npm install failed ^(exit code !ERRORLEVEL!^).
    pause
    exit /b !ERRORLEVEL!
)

REM ── 4. Build with Tauri ───────────────────────────────────────────────────────
REM  NOTE: Tauri's beforeBuildCommand in tauri.conf.json already runs
REM        "npm run build" ^(tsc + Vite^) internally — no need to call it separately.
REM  NOTE: First Rust compilation can take 5-15 minutes.
echo.
echo npm run tauri build...
echo  ^(First Rust compilation may take 5-15 minutes — please wait.^)
echo.
call npm run tauri build
if !ERRORLEVEL! neq 0 (
    echo.
    echo  ERROR: Tauri build failed ^(exit code !ERRORLEVEL!^).
    echo         Scroll up to read the Rust/Tauri compiler error.
    pause
    exit /b !ERRORLEVEL!
)

REM ── 5. Locate installer artifacts ────────────────────────────────────────────
set "NSIS_DIR=src-tauri\target\release\bundle\nsis"
set "MSI_DIR=src-tauri\target\release\bundle\msi"
set "FOUND=0"
echo.
echo Build succeeded. Checking for installer artifacts...

if exist "%NSIS_DIR%\*.exe" (
    echo.
    echo   [NSIS installer]
    for %%F in ("%NSIS_DIR%\*.exe") do echo     %%~nxF  --^>  %NSIS_DIR%\%%~nxF
    set "FOUND=1"
)
if exist "%MSI_DIR%\*.msi" (
    echo.
    echo   [MSI installer]
    for %%F in ("%MSI_DIR%\*.msi") do echo     %%~nxF  --^>  %MSI_DIR%\%%~nxF
    set "FOUND=1"
)
if "!FOUND!"=="0" (
    echo   No installer bundle found. Tauri may require NSIS or WiX Toolset.
    echo   - NSIS ^(free^):         https://nsis.sourceforge.io/Download
    echo   - WiX Toolset ^(free^):  https://wixtoolset.org/
    echo.
    echo   Raw portable binary: src-tauri\target\release\scrcpy-gui-v4.exe
)

echo.
pause
