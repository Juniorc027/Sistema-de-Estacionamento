#!/usr/bin/env bash
# ============================================================
#  rebuild-clean.sh — Rebuild forçado completo
#  Down → prune builder → build sem cache → up
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    DC="docker compose"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
else
    echo -e "${RED}[ERRO]${NC} Docker Compose não encontrado."; exit 1
fi

info "Derrubando serviços..."
$DC down --remove-orphans

info "Limpando builder cache..."
docker builder prune -af

info "Rebuild sem cache..."
$DC build --no-cache --build-arg CACHEBUST="$(date +%s)"

info "Subindo serviços..."
$DC up -d --remove-orphans

ok "Rebuild completo finalizado!"
