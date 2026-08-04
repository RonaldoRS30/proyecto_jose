# Intenta encender MySQL automaticamente (XAMPP o servicio Windows).
$ErrorActionPreference = 'SilentlyContinue'

function Test-MySqlReady {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', 3306)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Start-XamppMySql {
    param([string]$XamppRoot)

    $mysqld = Join-Path $XamppRoot 'mysql\bin\mysqld.exe'
    $myIni = Join-Path $XamppRoot 'mysql\bin\my.ini'

    if (-not (Test-Path $mysqld)) { return $false }
    if (-not (Test-Path $myIni)) { return $false }

    Write-Host "[INFO] Iniciando MySQL de XAMPP ($XamppRoot)..."
    $cmd = "cd /d `"$XamppRoot`" && mysql\bin\mysqld --defaults-file=mysql\bin\my.ini --standalone"
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $cmd -WindowStyle Minimized
    return $true
}

function Start-WindowsMySqlService {
    $services = Get-Service | Where-Object {
        ($_.Name -match 'mysql|maria' -or $_.DisplayName -match 'mysql|maria') -and $_.Status -ne 'Running'
    }

    if (-not $services) { return $false }

    foreach ($service in $services) {
        Write-Host "[INFO] Iniciando servicio $($service.DisplayName)..."
        Start-Service $service.Name -ErrorAction SilentlyContinue
    }

    return $true
}

if (Test-MySqlReady) {
    Write-Host '[OK] MySQL ya esta activo en el puerto 3306.'
    exit 0
}

Write-Host '[INFO] MySQL no responde. Intentando iniciarlo automaticamente...'

$started = $false
$xamppPaths = @('C:\xampp', 'D:\xampp', "$env:ProgramFiles\xampp")

foreach ($path in $xamppPaths) {
    if (Start-XamppMySql -XamppRoot $path) {
        $started = $true
        break
    }
}

if (-not $started) {
    $started = Start-WindowsMySqlService
}

if (-not $started) {
    Write-Host '[ERROR] No se encontro MySQL/XAMPP para iniciar automaticamente.'
    Write-Host '        Instale XAMPP o MySQL y vuelva a ejecutar el archivo .bat'
    exit 1
}

for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-MySqlReady) {
        Write-Host '[OK] MySQL activo en el puerto 3306.'
        exit 0
    }
    if ($i % 5 -eq 0) {
        Write-Host "       Esperando MySQL... ($i/30)"
    }
}

Write-Host '[ERROR] MySQL no respondio despues de intentar iniciarlo.'
exit 1
