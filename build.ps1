#Requires -Version 5.1
<#
.SYNOPSIS
    Builds ScrcpyGUI via Tauri and produces a Windows installer bundle.
.DESCRIPTION
    - Ensures Rust/Cargo is on PATH (rustup default location).
    - Validates node, npm, and cargo before starting.
    - Runs: npm install  →  npm run tauri build
      (Tauri's beforeBuildCommand in tauri.conf.json runs the Vite frontend build automatically.)
    - Saves full output to build.log in the project root.
    - Pauses with a clear message on any failure.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Paths ─────────────────────────────────────────────────────────────────────
$Root    = $PSScriptRoot
$LogFile = Join-Path $Root 'build.log'
$BundleDir = Join-Path $Root 'src-tauri\target\release\bundle\windows'

# ── Logging ───────────────────────────────────────────────────────────────────
'' | Set-Content $LogFile   # truncate / create
function Log {
    param([string]$Msg, [ConsoleColor]$Color = 'Cyan')
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $Msg"
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $line
}

function Fail {
    param([string]$Msg)
    Log "ERROR: $Msg" -Color Red
    Log "Full log saved to: $LogFile" -Color Yellow
    Write-Host ''
    Write-Host 'Press Enter to close...' -ForegroundColor Yellow
    $null = Read-Host
    exit 1
}

# ── Ensure Cargo is on PATH ───────────────────────────────────────────────────
$CargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path (Join-Path $CargoBin 'cargo.exe')) {
    if ($env:PATH -notlike "*$CargoBin*") {
        $env:PATH = "$CargoBin;$env:PATH"
        Log "Added $CargoBin to PATH for this session."
    }
} else {
    Fail "Rust/Cargo not found at $CargoBin.`nInstall Rust from: https://rustup.rs"
}

# ── Verify required tools ─────────────────────────────────────────────────────
Log '── Checking prerequisites ──────────────────────────────────────'
foreach ($tool in @('node', 'npm', 'cargo')) {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) {
        $ver = & $tool --version 2>&1
        Log "  $tool  →  $($cmd.Source)  ($($ver -replace "`n",''))"
    } else {
        Fail "$tool not found in PATH. Ensure it is installed and restart VS Code."
    }
}

# ── Change into project root ──────────────────────────────────────────────────
Set-Location $Root

# ── npm install ───────────────────────────────────────────────────────────────
Log ''
Log '── npm install ─────────────────────────────────────────────────'
& npm install 2>&1 | Tee-Object -FilePath $LogFile -Append
if ($LASTEXITCODE -ne 0) {
    Fail "npm install failed (exit code $LASTEXITCODE). See $LogFile for details."
}

# ── Tauri build ───────────────────────────────────────────────────────────────
# Tauri's beforeBuildCommand ("npm run build") runs tsc + vite automatically.
# No need to run "npm run build" separately.
Log ''
Log '── npm run tauri build ──────────────────────────────────────────'
Log '    (this compiles Rust + bundles the frontend — first run takes 5-15 min)'
& npm run tauri build 2>&1 | Tee-Object -FilePath $LogFile -Append
if ($LASTEXITCODE -ne 0) {
    Fail "tauri build failed (exit code $LASTEXITCODE). See $LogFile for details."
}

# ── Locate artifacts ──────────────────────────────────────────────────────────
Log ''
Log '── Build complete — locating installer artifacts ────────────────' -Color Green

if (Test-Path $BundleDir) {
    $exes = @(Get-ChildItem $BundleDir -Filter '*.exe' -ErrorAction SilentlyContinue)
    $msis = @(Get-ChildItem $BundleDir -Filter '*.msi' -ErrorAction SilentlyContinue)

    if ($exes.Count -gt 0) {
        Log "  Installer EXE(s) in $BundleDir :" -Color Green
        $exes | ForEach-Object { Log "    $($_.Name)  ($([math]::Round($_.Length/1MB,1)) MB)" -Color Green }
    }
    if ($msis.Count -gt 0) {
        Log "  MSI(s) in $BundleDir :" -Color Green
        $msis | ForEach-Object { Log "    $($_.Name)  ($([math]::Round($_.Length/1MB,1)) MB)" -Color Green }
    }
    if ($exes.Count -eq 0 -and $msis.Count -eq 0) {
        Log "  No installer found in $BundleDir" -Color Yellow
        Log "  The app binary is at: src-tauri\target\release\scrcpy-gui-v4.exe" -Color Yellow
    }
} else {
    Log "  Bundle directory not found: $BundleDir" -Color Yellow
    Log "  The app binary may be at: src-tauri\target\release\scrcpy-gui-v4.exe" -Color Yellow
}

Log ''
Log "Full build log saved to: $LogFile" -Color Green
Write-Host ''
Write-Host 'Press Enter to close...' -ForegroundColor Cyan
$null = Read-Host
