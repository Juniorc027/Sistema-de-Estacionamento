#!/usr/bin/env bash
# ============================================================
#  docker-clean-cache.sh — Limpar cache Docker
#
#  Uso:
#    ./scripts/docker-clean-cache.sh              # seguro: builder + dangling
#    ./scripts/docker-clean-cache.sh --prune-all  # nuclear: remove TUDO
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

if [[ "${1:-}" == "--prune-all" ]]; then
    warn "MODO NUCLEAR: Vai remover TUDO (containers, imagens, volumes, cache)"
    read -p "Tem certeza? (s/N): " confirm
    if [[ "$confirm" =~ ^[sS]$ ]]; then
        docker system prune -af --volumes
        ok "Tudo removido."
    else
        info "Cancelado."
    fi
else
    info "Limpando builder cache e imagens dangling (NÃO toca volumes)..."
    docker builder prune -af
    docker image prune -f
    ok "Cache limpo."
fi
