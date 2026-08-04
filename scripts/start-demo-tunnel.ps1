param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$localUrl = "http://localhost:$Port"

Write-Host ''
Write-Host '================================================'
Write-Host '  Demo remota - Tunel desde PC local'
Write-Host '================================================'
Write-Host ''

Write-Host "[1/3] Comprobando que el frontend responda en $localUrl ..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
  try {
    $null = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  Write-Host ''
  Write-Host '[ERROR] El frontend no responde.' -ForegroundColor Red
  Write-Host 'Primero ejecute: iniciar-sistema-local.bat'
  Write-Host 'Espere a ver "Frontend listo en http://localhost:5173" y vuelva a intentar.'
  Write-Host ''
  exit 1
}

Write-Host '[OK] Frontend activo.'
Write-Host ''

Write-Host '[2/3] Buscando herramienta de tunel (cloudflared o ngrok) ...'

$projectCloudflared = Join-Path $root 'tools\cloudflared.exe'
$downloadsCloudflared = Join-Path $env:USERPROFILE 'Downloads\cloudflared-windows-amd64.exe'

$cloudflaredPath = $null
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
  $cloudflaredPath = (Get-Command cloudflared).Source
} elseif (Test-Path $projectCloudflared) {
  $cloudflaredPath = $projectCloudflared
} elseif (Test-Path $downloadsCloudflared) {
  New-Item -ItemType Directory -Force -Path (Split-Path $projectCloudflared -Parent) | Out-Null
  Copy-Item $downloadsCloudflared $projectCloudflared -Force
  $cloudflaredPath = $projectCloudflared
  Write-Host "[INFO] cloudflared copiado a $projectCloudflared"
}

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $cloudflaredPath -and -not $ngrok) {
  Write-Host ''
  Write-Host '[ERROR] No hay cloudflared ni ngrok instalados.' -ForegroundColor Red
  Write-Host ''
  Write-Host 'Opcion A - Cloudflare Tunnel (recomendada, sin cuenta):'
  Write-Host '  1. Descargue cloudflared desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
  Write-Host '  2. Extraiga cloudflared.exe y agreguelo al PATH de Windows'
  Write-Host '  3. Vuelva a ejecutar demo-tunel-local.bat'
  Write-Host ''
  Write-Host 'Opcion B - ngrok (requiere cuenta gratis):'
  Write-Host '  1. Registrese en https://ngrok.com'
  Write-Host '  2. Instale ngrok y ejecute: ngrok config add-authtoken SU_TOKEN'
  Write-Host '  3. Vuelva a ejecutar demo-tunel-local.bat'
  Write-Host ''
  exit 1
}

Write-Host ''
Write-Host '[3/3] Iniciando tunel publico ...'
Write-Host ''
Write-Host 'IMPORTANTE:'
Write-Host '  - Mantenga esta ventana ABIERTA mientras el cliente prueba.'
Write-Host '  - Mantenga tambien abiertas las ventanas Backend y Frontend.'
Write-Host '  - Su PC debe permanecer encendido y con internet.'
Write-Host '  - Copie la URL https://... que aparezca abajo y enviela al cliente.'
Write-Host '  - Admin demo: admin@sistema.com / Admin123!'
Write-Host ''
Write-Host '================================================'
Write-Host ''

if ($cloudflaredPath) {
  Write-Host 'Usando Cloudflare Tunnel (trycloudflare.com)...' -ForegroundColor Cyan
  Write-Host ''
  # http2 suele ser mas estable que quic en WiFi / redes domesticas
  & $cloudflaredPath tunnel --protocol http2 --url $localUrl
} else {
  Write-Host 'Usando ngrok...' -ForegroundColor Cyan
  Write-Host ''
  & ngrok http $Port
}
