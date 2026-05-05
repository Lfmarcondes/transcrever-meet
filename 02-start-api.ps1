$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot"

if (!(Test-Path .venv)) {
  Write-Host 'Ambiente nao encontrado. Rode 01-setup.ps1 primeiro.'
  exit 1
}

Write-Host 'Iniciando API em http://127.0.0.1:8080 ...'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
