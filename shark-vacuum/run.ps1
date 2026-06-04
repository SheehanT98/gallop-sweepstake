# Start Shark Home local controller
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
Write-Host "Open http://127.0.0.1:8765 in your browser" -ForegroundColor Green
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
