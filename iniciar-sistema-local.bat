@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Iniciar Sistema - Consumo Electrico

cd /d "%~dp0"

echo ================================================
echo   Sistema de Consumo Electrico - Modo Local
echo   Inicio automatico: MySQL + Backend + Frontend
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado.
  echo Descargalo desde https://nodejs.org
  pause
  exit /b 1
)

if not exist "backend\.env" (
  if exist "backend\.env.example" (
    echo [INFO] Creando backend\.env desde .env.example ...
    copy /Y "backend\.env.example" "backend\.env" >nul
  ) else (
    echo [ERROR] Falta backend\.env
    pause
    exit /b 1
  )
)

echo [1/6] Verificando / iniciando MySQL ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mysql.ps1"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
echo.

if not exist "backend\node_modules\" (
  echo [2/6] Instalando dependencias del backend...
  pushd backend
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install en backend.
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo [2/6] Dependencias del backend OK.
)

if not exist "frontend\node_modules\" (
  echo [3/6] Instalando dependencias del frontend...
  pushd frontend
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install en frontend.
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo [3/6] Dependencias del frontend OK.
)
echo.

echo [4/6] Preparando base de datos ...
pushd backend
call npm run ensure-db
if errorlevel 1 (
  popd
  echo.
  echo Si su MySQL tiene contraseña, edite DB_PASSWORD en backend\.env
  pause
  exit /b 1
)
popd
echo.

echo [5/6] Iniciando backend ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-port.ps1" -Port 5000 >nul 2>&1
timeout /t 1 /nobreak >nul

start "Backend - Consumo Electrico" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

set /a INTENTOS=0
:ESPERAR_BACKEND
timeout /t 2 /nobreak >nul
set /a INTENTOS+=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-url.ps1" -Url "http://localhost:5000/api/health" -TimeoutSec 2 >nul 2>&1
if errorlevel 1 (
  if %INTENTOS% LSS 25 goto ESPERAR_BACKEND
  echo [ERROR] El backend no respondio. Revise la ventana Backend - Consumo Electrico.
  pause
  exit /b 1
)
echo [OK] Backend listo en http://localhost:5000
echo.

:INICIAR_FRONTEND
echo [6/6] Iniciando frontend ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-port.ps1" -Port 5173 >nul 2>&1
timeout /t 1 /nobreak >nul

start "Frontend - Consumo Electrico" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

set /a INTENTOS=0
:ESPERAR_FRONTEND
timeout /t 2 /nobreak >nul
set /a INTENTOS+=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-url.ps1" -Url "http://localhost:5173" -TimeoutSec 2 >nul 2>&1
if errorlevel 1 (
  if %INTENTOS% LSS 20 goto ESPERAR_FRONTEND
  echo [AVISO] Frontend lento en responder, abriendo navegador...
  goto ABRIR_NAVEGADOR
)
echo [OK] Frontend listo en http://localhost:5173

:ABRIR_NAVEGADOR
start "" "http://localhost:5173"

echo.
echo ================================================
echo   Todo listo - puede usar el sistema
echo ================================================
echo   Web:    http://localhost:5173
echo   API:    http://localhost:5000/api
echo   Admin:  admin@sistema.com / Admin123!
echo.
echo   Para cerrar: cierre las ventanas Backend y Frontend.
echo ================================================
echo.
pause
