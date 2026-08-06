#!/usr/bin/env bash
#
# Despliegue en VPS (Hetzner / Ubuntu)
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_APP_NAME="${PM2_APP_NAME:-proyecto-jose-api}"
GIT_BRANCH="${GIT_BRANCH:-main}"

log() { echo "[deploy] $*"; }
fail() { echo "[deploy] ERROR: $*" >&2; exit 1; }

command -v git >/dev/null || fail "git no está instalado"
command -v npm >/dev/null || fail "npm no está instalado"
command -v pm2 >/dev/null || fail "pm2 no está instalado"

cd "$ROOT_DIR"

if [[ ! -f "backend/.env" ]]; then
  fail "Falta backend/.env. Créalo en el servidor antes de desplegar."
fi

log "Actualizando código (rama ${GIT_BRANCH})..."
if [[ -n "$(git status --porcelain deploy.sh 2>/dev/null || true)" ]]; then
  log "Descartando cambios locales en deploy.sh..."
  git checkout -- deploy.sh
fi
git fetch origin "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"

log "Backend: instalando dependencias..."
cd "$ROOT_DIR/backend"
npm install --omit=dev

log "Backend: verificando base de datos..."
npm run ensure-db

log "Backend: aplicando migraciones de esquema..."
npm run ensure-schema

log "Backend: carpetas de archivos..."
mkdir -p uploads/reportes uploads/excel

if command -v python3 >/dev/null; then
  log "Backend: entorno Python (.venv) para Excel..."
  if ! python3 -c "import venv" >/dev/null 2>&1; then
    apt-get install -y python3-venv python3-full >/dev/null 2>&1 || true
  fi
  if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
  fi
  .venv/bin/pip install -q --upgrade pip
  if [[ -f "requirements.txt" ]]; then
    .venv/bin/pip install -q -r requirements.txt
  else
    .venv/bin/pip install -q xlsxwriter
  fi
  .venv/bin/python -c "import xlsxwriter; print('[OK] xlsxwriter listo')"
else
  log "AVISO: python3 no encontrado. La exportación Excel no funcionará."
fi

log "Backend: limpiando procesos PM2 duplicados en puerto 5000..."
for dup in electrix-api proyecto-jose-api; do
  if [[ "$dup" != "$PM2_APP_NAME" ]] && pm2 describe "$dup" >/dev/null 2>&1; then
    log "Eliminando proceso duplicado: $dup"
    pm2 delete "$dup" || true
  fi
done

log "Backend: reiniciando PM2 (${PM2_APP_NAME})..."
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start server.js --name "$PM2_APP_NAME"
  pm2 save
fi

log "Frontend: instalando dependencias..."
cd "$ROOT_DIR/frontend"
npm install

log "Frontend: compilando producción..."
npm run build

if command -v nginx >/dev/null; then
  log "Recargando Nginx..."
  if [[ "$(id -u)" -eq 0 ]]; then
    nginx -t && systemctl reload nginx
  else
    sudo nginx -t && sudo systemctl reload nginx
  fi
else
  log "Nginx no detectado; omitiendo reload."
fi

log "Verificando API..."
sleep 2
if curl -fsS "http://127.0.0.1:5000/api/health" >/dev/null; then
  log "API OK: http://127.0.0.1:5000/api/health"
else
  fail "La API no respondió. Revise: pm2 logs ${PM2_APP_NAME}"
fi

log "Despliegue completado."
