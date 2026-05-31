@echo off
echo Lancement de LLM Council...

set OPENROUTER_API_KEY=REMPLACER_PAR_TA_CLE

start "Backend" cmd /k "cd /d C:\Users\matin\desktop\Council_LLM && uv run python -m backend.main"

timeout /t 3 /nobreak >nul

start "Frontend" cmd /k "cd /d C:\Users\matin\desktop\Council_LLM\frontend && npm run dev"

echo Backend: http://localhost:8001
echo Frontend: http://localhost:5173
start http://localhost:5173