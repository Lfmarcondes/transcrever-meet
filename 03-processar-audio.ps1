param(
  [Parameter(Mandatory=$true)]
  [string]$AudioPath
)

$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot"

if (!(Test-Path .venv)) {
  Write-Host 'Ambiente nao encontrado. Rode 01-setup.ps1 primeiro.'
  exit 1
}

if (!(Test-Path $AudioPath)) {
  Write-Host "Arquivo nao encontrado: $AudioPath"
  exit 1
}

$body = @{ audio_path = $AudioPath } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8080/transcribe-file' -ContentType 'application/json' -Body $body
$outDir = 'C:\tmp\meet-results'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir ("resultado_" + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.json')
$response | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $outFile

Write-Host "Resultado salvo em: $outFile"
