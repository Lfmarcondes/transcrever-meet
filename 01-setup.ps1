$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot"

if (!(Test-Path .venv)) {
  Write-Host 'Criando ambiente virtual...'
  & 'C:\Users\luizf\AppData\Local\Programs\Python\Python313\python.exe' -m venv .venv
}

Write-Host 'Instalando dependencias...'
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

if (!(Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Arquivo .env criado. Preencha suas chaves de API nele.'
}

Write-Host 'Setup concluido.'
