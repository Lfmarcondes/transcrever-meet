param(
  [int]$MaxMinutes = 120
)

$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot"

if (!(Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Criei .env. Preencha as chaves antes de continuar.'
  exit 1
}

if (!(Test-Path .venv)) {
  Write-Host 'Ambiente nao encontrado. Rode .\01-setup.ps1 primeiro.'
  exit 1
}

$outDir = 'C:\tmp\meet-recordings'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$wavPath = Join-Path $outDir ("meet_$stamp.wav")

Write-Host 'Iniciando gravacao da reuniao (audio do sistema)...'
Write-Host 'Quando a reuniao acabar, volte aqui e pressione ENTER.'

$ffmpeg = 'ffmpeg'
$args = @('-y','-f','wasapi','-i','default','-ac','1','-ar','16000','-t',($MaxMinutes*60),$wavPath)
$proc = Start-Process -FilePath $ffmpeg -ArgumentList $args -PassThru -WindowStyle Hidden

Read-Host | Out-Null
if (!$proc.HasExited) {
  Stop-Process -Id $proc.Id -Force
  Start-Sleep -Seconds 2
}

if (!(Test-Path $wavPath)) {
  Write-Host 'Falha ao gerar gravacao.'
  exit 1
}

Write-Host "Gravacao salva: $wavPath"
Write-Host 'Processando automaticamente...'

$body = @{ audio_path = $wavPath } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8080/transcribe-file' -ContentType 'application/json' -Body $body

$resDir = 'C:\tmp\meet-results'
New-Item -ItemType Directory -Force -Path $resDir | Out-Null
$resFile = Join-Path $resDir ("resultado_$stamp.json")
$response | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $resFile

Write-Host "Resultado salvo em: $resFile"
