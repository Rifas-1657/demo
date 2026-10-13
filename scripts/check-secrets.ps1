# Bookey Secrets Check Script
# Runs gitleaks to scan for accidentally committed secrets
#
# Usage: .\scripts\check-secrets.ps1
# Or with custom flags: .\scripts\check-secrets.ps1 --verbose

param(
    [switch]$Verbose = $false,
    [switch]$Install = $false
)

$ErrorActionPreference = "Stop"

$GITLEAKS_VERSION = "8.22.1"
$GITLEAKS_URL = "https://github.com/gitleaks/gitleaks/releases/download/v$GITLEAKS_VERSION/gitleaks_${GITLEAKS_VERSION}_windows_x64.zip"
$TOOLS_DIR = "$PSScriptRoot\..\tools"
$GITLEAKS_ZIP = "$TOOLS_DIR\gitleaks.zip"
$GITLEAKS_EXE = "$TOOLS_DIR\gitleaks.exe"

function Install-Gitleaks {
    Write-Host "Installing gitleaks v$GITLEAKS_VERSION..." -ForegroundColor Cyan
    
    if (-not (Test-Path $TOOLS_DIR)) {
        New-Item -ItemType Directory -Path $TOOLS_DIR | Out-Null
    }

    Write-Host "Downloading from $GITLEAKS_URL..."
    Invoke-WebRequest -Uri $GITLEAKS_URL -OutFile $GITLEAKS_ZIP -UseBasicParsing
    
    Write-Host "Extracting..."
    Expand-Archive -Path $GITLEAKS_ZIP -DestinationPath $TOOLS_DIR -Force
    Remove-Item $GITLEAKS_ZIP
    
    Write-Host "✓ Gitleaks installed to $GITLEAKS_EXE" -ForegroundColor Green
}

# Check if gitleaks is installed
if (-not (Test-Path $GITLEAKS_EXE)) {
    Write-Host "Gitleaks not found. Installing..." -ForegroundColor Yellow
    Install-Gitleaks
} elseif ($Install) {
    Write-Host "Reinstalling gitleaks..." -ForegroundColor Yellow
    Install-Gitleaks
}

# Run gitleaks
Write-Host "`nScanning for secrets with gitleaks..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\.."

try {
    $gitleaksArgs = @("detect", "--config", ".gitleaks.toml", "--source", ".", "--no-git")
    
    if ($Verbose) {
        $gitleaksArgs += "--verbose"
    }
    
    & $GITLEAKS_EXE $gitleaksArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ No secrets detected" -ForegroundColor Green
        exit 0
    } elseif ($LASTEXITCODE -eq 1) {
        Write-Host "`n✗ Secrets detected! Review the output above." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "`n✗ Gitleaks error (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
