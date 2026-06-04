@echo off
cd /d "%~dp0"
if not exist .env (
  echo Create .env from .env.example first.
  exit /b 1
)
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q
python -m app.main
pause
