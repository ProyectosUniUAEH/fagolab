param(
    [switch]$StopOnly
)

$ErrorActionPreference = "Stop"
$frontendDir = Split-Path -Parent $PSScriptRoot
$workspaceDir = Split-Path -Parent $frontendDir
$backendDir = Join-Path $workspaceDir "fago-api"

function Get-ProcessInfo([int]$ProcessId) {
    Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
}

function Stop-FagoListener([int]$Port, [string]$ExpectedPattern) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $process = Get-ProcessInfo $listener.OwningProcess
        if (-not $process) {
            continue
        }
        if ($process.CommandLine -notmatch $ExpectedPattern) {
            throw "El puerto $Port lo usa un proceso ajeno: $($process.CommandLine)"
        }

        $ids = @($process.ProcessId)
        $parent = Get-ProcessInfo $process.ParentProcessId
        while ($parent -and $parent.CommandLine -match "uvicorn|vite|npm-cli|npm\.cmd") {
            $ids += $parent.ProcessId
            $parent = Get-ProcessInfo $parent.ParentProcessId
        }
        Stop-Process -Id ($ids | Select-Object -Unique) -Force -ErrorAction SilentlyContinue
    }
}

Stop-FagoListener 5173 "vite"
Stop-FagoListener 8000 "uvicorn"
Start-Sleep -Seconds 1

if ($StopOnly) {
    Write-Host "Fago local detenido. Puertos 5173 y 8000 libres."
    exit 0
}

$postgres = docker ps -a --filter "name=^/fago-postgres$" --format "{{.Names}}"
if ($postgres -ne "fago-postgres") {
    throw "No existe el contenedor local fago-postgres."
}
docker start fago-postgres | Out-Null

$tempDir = [System.IO.Path]::GetTempPath()
Start-Process -FilePath "py.exe" `
    -ArgumentList "-3", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $tempDir "fago-api.log") `
    -RedirectStandardError (Join-Path $tempDir "fago-api.err.log")

Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $frontendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $tempDir "fago-vite.log") `
    -RedirectStandardError (Join-Path $tempDir "fago-vite.err.log")

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2
        $dashboard = Invoke-RestMethod -Uri "http://127.0.0.1:5173/api/dashboard" -TimeoutSec 2
        if ($health.db -eq $true -and $null -ne $dashboard.kpis) {
            $ready = $true
            break
        }
    } catch {
        # Esperar mientras terminan de iniciar Uvicorn y Vite.
    }
}

if (-not $ready) {
    throw "Fago no quedó listo. Revisa $tempDir\fago-api.err.log y $tempDir\fago-vite.err.log"
}

$lanIp = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like "192.168.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress

Write-Host "Fago local listo."
Write-Host "Laptop: http://localhost:5173"
if ($lanIp) {
    Write-Host "LAN/iPad: http://${lanIp}:5173"
}
Write-Host "Cajas en BD: $($dashboard.kpis.cajas)"
