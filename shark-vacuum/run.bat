@echo off
cd /d "%~dp0"
if not exist .env (
  echo Create .env from .env.example first.
  exit /b 1
)
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo Open http://127.0.0.1:8765 in your browser
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
