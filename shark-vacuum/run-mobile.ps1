# Start Shark Home for phone access on your home Wi-Fi
Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env - add your SharkClean login, then run again." -ForegroundColor Yellow
    exit 1
}

if (-not (Select-String -Path .env -Pattern '^\s*SHARK_LAN\s*=' -Quiet)) {
    Add-Content .env "`nSHARK_LAN=true"
    Write-Host "Added SHARK_LAN=true to .env" -ForegroundColor Cyan
} else {
    (Get-Content .env) -replace '^\s*SHARK_LAN\s*=.*', 'SHARK_LAN=true' | Set-Content .env
}

& "$PSScriptRoot\run.ps1"
