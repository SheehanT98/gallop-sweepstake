# Start Shark Home (desktop or LAN — set SHARK_LAN=true in .env for phone)
Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
    Write-Host "Create .env from .env.example first (SharkClean email/password)." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path .venv)) {
    python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q

$lan = Select-String -Path .env -Pattern '^\s*SHARK_LAN\s*=\s*true' -Quiet
if ($lan) {
    Write-Host ""
    Write-Host "LAN mode — use on your phone (same Wi-Fi):" -ForegroundColor Cyan
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -First 1).IPAddress
    if ($ip) {
        Write-Host "  http://${ip}:8765" -ForegroundColor Green
    } else {
        Write-Host "  http://<your-PC-IP>:8765  (run ipconfig to find IPv4)" -ForegroundColor Yellow
    }
    Write-Host "  PC must stay on with this window open." -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "Open http://127.0.0.1:8765 on this PC" -ForegroundColor Green
    Write-Host "For phone: add SHARK_LAN=true to .env and run .\run-mobile.ps1" -ForegroundColor DarkGray
}

python -m app.main
